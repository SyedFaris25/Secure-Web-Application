"""
=============================================================================
Admin Routes (Protected - Admin Only)
=============================================================================
SECURITY FEATURES:
  - Role-Based Access Control (RBAC): Enforces that only users with the
    "admin" role can query admin endpoints.
  - Paginated database queries to prevent Denial of Service (DoS) memory leaks.
  - Safe audit log outputs containing user references.

OWASP PROTECTIONS:
  - Broken Access Control: Limits sensitive user details and administrative
    controls to authenticated admins.
  - Security Misconfiguration: Returns proper HTTP status codes on auth failure.
=============================================================================
"""

import os
from datetime import datetime, timezone, timedelta
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db
from models.user import User
from models.audit_log import AuditLog
from models.login_history import LoginHistory
from models.failed_login import FailedLogins
from models.role import Role
from models.folder import Folder
from models.file import FileModel
from services.auth_service import log_action

admin_bp = Blueprint("admin", __name__)


def admin_required(fn):
    """
    Decorator to restrict route access to Admin users only.
    OWASP: Broken Access Control protection.
    """
    @jwt_required()
    def wrapper(*args, **kwargs):
        user_id = int(get_jwt_identity())
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            # SECURITY: Generic error message to avoid information disclosure
            return jsonify({"error": "Admin privilege required."}), 403
        return fn(*args, **kwargs)
    wrapper.__name__ = fn.__name__
    return wrapper


@admin_bp.route("/api/admin/statistics", methods=["GET"])
@admin_required
def get_statistics():
    """
    Retrieve statistics dashboard metrics.
    """
    today_start = datetime.now(timezone.utc).replace(hour=0, minute=0, second=0, microsecond=0)

    total_users = User.query.count()
    active_users = User.query.filter_by(is_active=True).count()
    failed_attempts = FailedLogins.query.count()
    audit_logs_count = AuditLog.query.count()
    registered_today = User.query.filter(User.created_at >= today_start).count()
    
    total_files = FileModel.query.count()
    total_folders = Folder.query.count()
    total_storage = db.session.query(db.func.sum(FileModel.size)).scalar() or 0

    return jsonify({
        "totalUsers": total_users,
        "activeUsers": active_users,
        "failedLoginAttempts": failed_attempts,
        "auditLogsCount": audit_logs_count,
        "registeredToday": registered_today,
        "totalFiles": total_files,
        "totalFolders": total_folders,
        "totalStorageUsed": total_storage
    }), 200


@admin_bp.route("/api/admin/users", methods=["GET"])
@admin_required
def get_users_list():
    """
    Return paginated, searchable, and filterable list of all users.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search_query = request.args.get("search", "").strip()
    role_filter = request.args.get("role", "").strip()
    status_filter = request.args.get("status", "").strip()  # active, inactive

    # Build base query
    query = User.query

    # Search filter (name or email)
    if search_query:
        query = query.filter(
            User.name.ilike(f"%{search_query}%") | User.email.ilike(f"%{search_query}%")
        )

    # Role filter
    if role_filter:
        query = query.filter(User.role == role_filter)

    # Status filter
    if status_filter:
        is_active_val = status_filter == "active"
        query = query.filter(User.is_active == is_active_val)

    # Order by creation date descending
    paginated_users = query.order_by(User.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    return jsonify({
        "users": [u.to_dict() for u in paginated_users.items],
        "total": paginated_users.total,
        "pages": paginated_users.pages,
        "current_page": paginated_users.page
    }), 200


@admin_bp.route("/api/admin/logs", methods=["GET"])
@admin_required
def get_audit_logs():
    """
    Return paginated and filterable system audit logs.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    action_filter = request.args.get("action", "").strip()
    search_query = request.args.get("search", "").strip()

    query = AuditLog.query

    # Search filter
    if search_query:
        # Search by email of user, or action
        query = query.join(User).filter(
            User.email.ilike(f"%{search_query}%") |
            User.name.ilike(f"%{search_query}%") |
            AuditLog.action.ilike(f"%{search_query}%")
        )

    # Action category filter
    if action_filter:
        query = query.filter(AuditLog.action == action_filter)

    paginated_logs = query.order_by(AuditLog.created_at.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    logs_list = []
    for log in paginated_logs.items:
        log_dict = log.to_dict()
        # Attach email/name for easier reference
        log_dict["user_email"] = log.user.email if log.user else "System"
        log_dict["user_name"] = log.user.name if log.user else "System"
        logs_list.append(log_dict)

    return jsonify({
        "logs": logs_list,
        "total": paginated_logs.total,
        "pages": paginated_logs.pages,
        "current_page": paginated_logs.page
    }), 200


@admin_bp.route("/api/change-role", methods=["POST"])
@admin_bp.route("/api/admin/change-role", methods=["PUT"])
@admin_required
def change_role():
    """
    Update a target user's administrative role.
    """
    admin_id = int(get_jwt_identity())
    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body is required."}), 400

    target_user_id = data.get("userId")
    new_role = data.get("role", "").strip().lower()

    if not target_user_id or new_role not in ["admin", "user"]:
        return jsonify({"error": "Invalid user ID or role parameter."}), 400

    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({"error": "Target user not found."}), 404

    # Assign role relation FK
    role_obj = Role.query.filter_by(name=new_role).first()
    if not role_obj:
        return jsonify({"error": "Internal role error."}), 500

    target_user.role = new_role
    target_user.role_id = role_obj.id
    db.session.commit()

    # Log administrative action in audit trail
    log_action(admin_id, f"ADMIN_ROLE_CHANGE: User {target_user.email} role updated to {new_role}")

    return jsonify({
        "message": f"User role changed successfully to {new_role}.",
        "user": target_user.to_dict()
    }), 200


@admin_bp.route("/api/admin/users/<int:user_id>/toggle-active", methods=["POST"])
@admin_required
def toggle_user_active(user_id):
    """
    Activate/Deactivate a user account.
    """
    admin_id = int(get_jwt_identity())
    if admin_id == user_id:
        return jsonify({"error": "Self-deactivation is forbidden."}), 403

    target_user = User.query.get(user_id)
    if not target_user:
        return jsonify({"error": "User not found."}), 404

    target_user.is_active = not target_user.is_active
    db.session.commit()

    action_label = "ACTIVATED" if target_user.is_active else "DEACTIVATED"
    log_action(admin_id, f"ADMIN_USER_TOGGLE: {target_user.email} account status set to {action_label}")

    return jsonify({
        "message": f"User status set to {action_label}.",
        "user": target_user.to_dict()
    }), 200


@admin_bp.route("/api/delete-user", methods=["DELETE"])
@admin_bp.route("/api/admin/delete-user", methods=["DELETE"])
@admin_required
def delete_user():
    """
    Permanently delete a target user account.
    """
    admin_id = int(get_jwt_identity())
    
    # We can accept target user ID via JSON body or query param
    target_user_id = request.args.get("userId") or request.get_json().get("userId")

    if not target_user_id:
        return jsonify({"error": "Target user ID is required."}), 400

    if int(target_user_id) == admin_id:
        return jsonify({"error": "Self-deletion is forbidden."}), 403

    target_user = User.query.get(target_user_id)
    if not target_user:
        return jsonify({"error": "Target user not found."}), 404

    # Log action before deleting record
    user_email = target_user.email
    log_action(admin_id, f"ADMIN_USER_DELETED: Profile for {user_email} permanently removed")

    # Delete record
    db.session.delete(target_user)
    db.session.commit()

    return jsonify({"message": f"User {user_email} permanently deleted."}), 200


@admin_bp.route("/api/admin/files", methods=["GET"])
@admin_required
def get_admin_files_list():
    """
    Return paginated, searchable list of all files across all users.
    """
    page = request.args.get("page", 1, type=int)
    per_page = request.args.get("per_page", 10, type=int)
    search_query = request.args.get("search", "").strip()

    query = FileModel.query

    if search_query:
        # Search by file original name or owner's email
        query = query.join(User).filter(
            FileModel.original_name.ilike(f"%{search_query}%") |
            User.email.ilike(f"%{search_query}%")
        )

    paginated_files = query.order_by(FileModel.upload_time.desc()).paginate(
        page=page, per_page=per_page, error_out=False
    )

    files_list = []
    for f in paginated_files.items:
        f_dict = f.to_dict()
        f_dict["owner_email"] = f.owner.email if f.owner else "Unknown"
        f_dict["owner_name"] = f.owner.name if f.owner else "Unknown"
        files_list.append(f_dict)

    return jsonify({
        "files": files_list,
        "total": paginated_files.total,
        "pages": paginated_files.pages,
        "current_page": paginated_files.page
    }), 200


@admin_bp.route("/api/admin/files/<int:file_id>", methods=["DELETE"])
@admin_required
def admin_delete_file(file_id):
    """
    Administrative deletion override to purge any file.
    """
    admin_id = int(get_jwt_identity())
    file_record = FileModel.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found."}), 404

    # Remove physical disk file
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    file_path = os.path.join(upload_dir, file_record.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    original_name = file_record.original_name
    owner_email = file_record.owner.email if file_record.owner else "Unknown"
    
    # Log administrative override
    log_action(admin_id, f"ADMIN_FILE_DELETED: Purged file '{original_name}' belonging to {owner_email}")

    db.session.delete(file_record)
    db.session.commit()

    return jsonify({"message": f"File '{original_name}' has been successfully purged by admin."}), 200

