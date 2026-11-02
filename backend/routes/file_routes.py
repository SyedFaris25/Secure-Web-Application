"""
=============================================================================
File and Folder Management Routes (Protected)
=============================================================================
SECURITY:
  - Verification of user ownership (broken access control protection)
  - AES-256-GCM file contents encryption/decryption
  - User quota restriction (storage exhaustion protection)
  - String sanitization for all folder/file names (XSS protection)
=============================================================================
"""

import os
import uuid
import io
from datetime import datetime, timezone
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from extensions import db, limiter
from models.user import User
from models.file import FileModel
from models.folder import Folder
from models.favorite import Favorite
from services.auth_service import log_action
from utils.security import sanitize_string
from utils.crypto import encrypt_file_data, decrypt_file_data

file_bp = Blueprint("file", __name__)

ALLOWED_EXTENSIONS = {"pdf", "docx", "txt", "png", "jpg", "jpeg", "zip"}
STORAGE_LIMIT = 100 * 1024 * 1024  # 100 MB default storage limit

def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS

def get_user_storage_used(user_id: int) -> int:
    """Sum size of all files belonging to user."""
    result = db.session.query(db.func.sum(FileModel.size)).filter_by(owner_id=user_id).scalar()
    return result if result is not None else 0

@file_bp.route("/api/upload", methods=["POST"])
@jwt_required()
@limiter.limit("20 per minute")
def upload_file():
    """
    Upload a secure encrypted file to the user's vault.
    SECURITY: Size check, format check, quota check, parent folder ownership check.
    """
    user_id = int(get_jwt_identity())
    user = User.query.get(user_id)
    if not user:
        return jsonify({"error": "User not found."}), 404

    if "file" not in request.files:
        return jsonify({"error": "No file part in the request."}), 400

    uploaded_file = request.files["file"]
    if uploaded_file.filename == "":
        return jsonify({"error": "No selected file."}), 400

    if not allowed_file(uploaded_file.filename):
        return jsonify({"error": f"File type not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}."}), 400

    # Read content to check size and encrypt
    file_bytes = uploaded_file.read()
    file_size = len(file_bytes)
    
    # 20MB limit check
    if file_size > 20 * 1024 * 1024:
        return jsonify({"error": "File size exceeds maximum 20MB limit."}), 400

    # Quota check
    used = get_user_storage_used(user_id)
    if used + file_size > STORAGE_LIMIT:
        return jsonify({"error": "Storage quota exceeded. Please free up space."}), 400

    # Validate parent folder if provided
    folder_id = request.form.get("folderId")
    if folder_id and folder_id.strip() and folder_id.lower() != "null":
        try:
            folder_id = int(folder_id)
            folder = Folder.query.get(folder_id)
            if not folder or folder.owner_id != user_id:
                return jsonify({"error": "Invalid parent folder."}), 403
        except ValueError:
            return jsonify({"error": "Invalid folder parameter."}), 400
    else:
        folder_id = None

    # Sanitize original name
    original_name = sanitize_string(uploaded_file.filename)
    if not original_name:
        original_name = f"unnamed_{uuid.uuid4().hex[:8]}"

    # Encrypt file contents
    salt, iv, ciphertext = encrypt_file_data(file_bytes)

    # Save encrypted content to disk with a secure random filename
    secure_disk_name = f"{uuid.uuid4().hex}.enc"
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    if not os.path.exists(upload_dir):
        os.makedirs(upload_dir, exist_ok=True)
    
    file_path = os.path.join(upload_dir, secure_disk_name)
    with open(file_path, "wb") as f:
        f.write(ciphertext)

    # Create metadata entry
    ext = original_name.rsplit(".", 1)[1].lower() if "." in original_name else "bin"
    file_record = FileModel(
        owner_id=user_id,
        folder_id=folder_id,
        filename=secure_disk_name,
        original_name=original_name,
        size=file_size,
        file_type=ext,
        encryption_key_salt=salt.hex(),
        encryption_iv=iv.hex()
    )
    db.session.add(file_record)
    db.session.commit()

    log_action(user_id, f"UPLOAD: File '{original_name}' encrypted and uploaded.")
    return jsonify({"message": "File uploaded and encrypted successfully.", "file": file_record.to_dict()}), 201

@file_bp.route("/api/files", methods=["GET"])
@jwt_required()
def get_files():
    """
    Get user files and folders in specified folder (or root).
    """
    user_id = int(get_jwt_identity())
    
    folder_id = request.args.get("folderId")
    favorite_filter = request.args.get("favorite")
    
    if folder_id and folder_id.strip() and folder_id.lower() != "null":
        try:
            folder_id = int(folder_id)
            folder = Folder.query.get(folder_id)
            if not folder or folder.owner_id != user_id:
                return jsonify({"error": "Invalid folder."}), 403
        except ValueError:
            return jsonify({"error": "Invalid folder parameter."}), 400
    else:
        folder_id = None

    # Retrieve folders (folders cannot be favorited, only files)
    folder_query = Folder.query.filter_by(owner_id=user_id, parent_id=folder_id)
    folders = [f.to_dict() for f in folder_query.order_by(Folder.name.asc()).all()]

    # Retrieve files
    file_query = FileModel.query.filter_by(owner_id=user_id)
    if favorite_filter == "true":
        file_query = file_query.filter_by(favorite=True)
    else:
        file_query = file_query.filter_by(folder_id=folder_id)

    files = [f.to_dict() for f in file_query.order_by(FileModel.original_name.asc()).all()]

    return jsonify({"folders": folders, "files": files}), 200

@file_bp.route("/api/file/<int:file_id>", methods=["GET"])
@jwt_required()
def download_file(file_id):
    """
    Decrypt and download the requested file.
    SECURITY: Owner validation.
    """
    user_id = int(get_jwt_identity())
    file_record = FileModel.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found."}), 404

    # SECURITY: Access control validation
    if file_record.owner_id != user_id:
        # Check if user is admin
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Unauthorized file access."}), 403

    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    file_path = os.path.join(upload_dir, file_record.filename)

    if not os.path.exists(file_path):
        return jsonify({"error": "Encrypted file body missing from disk."}), 404

    with open(file_path, "rb") as f:
        ciphertext = f.read()

    try:
        salt = bytes.fromhex(file_record.encryption_key_salt)
        iv = bytes.fromhex(file_record.encryption_iv)
        decrypted_bytes = decrypt_file_data(ciphertext, salt, iv)
    except Exception as e:
        return jsonify({"error": "Decryption failed. Storage encryption keys may be corrupted."}), 500

    log_action(user_id, f"DOWNLOAD: Decrypted and downloaded file '{file_record.original_name}'")
    return send_file(
        io.BytesIO(decrypted_bytes),
        download_name=file_record.original_name,
        as_attachment=True
    )

@file_bp.route("/api/file/<int:file_id>", methods=["PUT"])
@jwt_required()
def update_file(file_id):
    """
    Rename, toggle favorite, or move file.
    SECURITY: Owner validation.
    """
    user_id = int(get_jwt_identity())
    file_record = FileModel.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found."}), 404

    if file_record.owner_id != user_id:
        return jsonify({"error": "Unauthorized file modification."}), 403

    data = request.get_json()
    if not data:
        return jsonify({"error": "Request body required."}), 400

    # Handle Rename
    if "original_name" in data:
        new_name = sanitize_string(data["original_name"])
        if not new_name:
            return jsonify({"error": "Filename cannot be empty."}), 400
        old_name = file_record.original_name
        file_record.original_name = new_name
        log_action(user_id, f"RENAME: File renamed from '{old_name}' to '{new_name}'")

    # Handle Move
    if "folder_id" in data:
        target_folder_id = data["folder_id"]
        if target_folder_id is not None and str(target_folder_id).lower() != "null":
            target_folder = Folder.query.get(target_folder_id)
            if not target_folder or target_folder.owner_id != user_id:
                return jsonify({"error": "Invalid destination folder."}), 403
            file_record.folder_id = target_folder.id
        else:
            file_record.folder_id = None
        log_action(user_id, f"MOVE: File '{file_record.original_name}' moved to new folder.")

    # Handle Favorite
    if "favorite" in data:
        fav_val = bool(data["favorite"])
        file_record.favorite = fav_val
        
        # Sync Favorites table
        existing_fav = Favorite.query.filter_by(user_id=user_id, file_id=file_id).first()
        if fav_val and not existing_fav:
            new_fav = Favorite(user_id=user_id, file_id=file_id)
            db.session.add(new_fav)
        elif not fav_val and existing_fav:
            db.session.delete(existing_fav)
            
        log_action(user_id, f"FAVORITE: Set favorite={fav_val} for file '{file_record.original_name}'")

    file_record.last_modified = datetime.now(timezone.utc)
    db.session.commit()
    return jsonify({"message": "File updated successfully.", "file": file_record.to_dict()}), 200

@file_bp.route("/api/file/<int:file_id>", methods=["DELETE"])
@jwt_required()
def delete_file(file_id):
    """
    Delete file and remove encrypted content from disk.
    SECURITY: Owner validation.
  """
    user_id = int(get_jwt_identity())
    file_record = FileModel.query.get(file_id)
    if not file_record:
        return jsonify({"error": "File not found."}), 404

    # SECURITY: Access control validation
    if file_record.owner_id != user_id:
        user = User.query.get(user_id)
        if not user or user.role != "admin":
            return jsonify({"error": "Unauthorized file action."}), 403

    # Remove physical disk file
    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    file_path = os.path.join(upload_dir, file_record.filename)
    if os.path.exists(file_path):
        try:
            os.remove(file_path)
        except OSError:
            pass

    original_name = file_record.original_name
    db.session.delete(file_record)
    db.session.commit()

    log_action(user_id, f"DELETE: Permanently deleted file '{original_name}'")
    return jsonify({"message": f"File '{original_name}' permanently deleted."}), 200

@file_bp.route("/api/folder", methods=["POST"])
@jwt_required()
def create_folder():
    """
    Create a new directory in vault directory hierarchy.
    """
    user_id = int(get_jwt_identity())
    data = request.get_json()
    if not data or not data.get("name"):
        return jsonify({"error": "Folder name is required."}), 400

    folder_name = sanitize_string(data["name"])
    if not folder_name:
        return jsonify({"error": "Folder name cannot be empty."}), 400

    parent_id = data.get("parentId")
    if parent_id and str(parent_id).lower() != "null":
        try:
            parent_id = int(parent_id)
            parent = Folder.query.get(parent_id)
            if not parent or parent.owner_id != user_id:
                return jsonify({"error": "Invalid parent folder."}), 403
        except ValueError:
            return jsonify({"error": "Invalid parent folder parameter."}), 400
    else:
        parent_id = None

    folder = Folder(
        owner_id=user_id,
        parent_id=parent_id,
        name=folder_name
    )
    db.session.add(folder)
    db.session.commit()

    log_action(user_id, f"FOLDER_CREATE: Created folder '{folder_name}'")
    return jsonify({"message": "Folder created successfully.", "folder": folder.to_dict()}), 201

def _recursive_delete_folder(folder, upload_dir):
    """Recursively deletes all folders and files inside a folder."""
    # Delete all files inside folder
    for file_record in folder.files.all():
        file_path = os.path.join(upload_dir, file_record.filename)
        if os.path.exists(file_path):
            try:
                os.remove(file_path)
            except OSError:
                pass
        db.session.delete(file_record)
    
    # Recursively delete subfolders
    for sub in folder.subfolders:
        _recursive_delete_folder(sub, upload_dir)
        
    db.session.delete(folder)

@file_bp.route("/api/folder/<int:folder_id>", methods=["DELETE"])
@jwt_required()
def delete_folder(folder_id):
    """
    Delete folder and all its contents recursively.
    """
    user_id = int(get_jwt_identity())
    folder = Folder.query.get(folder_id)
    if not folder:
        return jsonify({"error": "Folder not found."}), 404

    if folder.owner_id != user_id:
        return jsonify({"error": "Unauthorized folder modification."}), 403

    upload_dir = current_app.config.get("UPLOAD_FOLDER")
    folder_name = folder.name
    
    _recursive_delete_folder(folder, upload_dir)
    db.session.commit()

    log_action(user_id, f"FOLDER_DELETE: Recursively deleted folder '{folder_name}' and all contents.")
    return jsonify({"message": f"Folder '{folder_name}' and contents deleted successfully."}), 200

@file_bp.route("/api/storage", methods=["GET"])
@jwt_required()
def get_storage_stats():
    """
    Get user quota and storage utilization metrics.
    """
    user_id = int(get_jwt_identity())
    used = get_user_storage_used(user_id)
    return jsonify({
        "used": used,
        "limit": STORAGE_LIMIT
    }), 200

@file_bp.route("/api/recent", methods=["GET"])
@jwt_required()
def get_recent_files():
    """
    Get recent upload history list and audit logging actions.
    """
    user_id = int(get_jwt_identity())
    # Retrieve 10 most recent files
    recent_files = FileModel.query.filter_by(owner_id=user_id).order_by(FileModel.upload_time.desc()).limit(10).all()
    
    # Retrieve last 10 logs
    from models.audit_log import AuditLog
    recent_logs = AuditLog.query.filter_by(user_id=user_id).order_by(AuditLog.created_at.desc()).limit(10).all()
    
    # Recent downloads from audit logs
    downloads = [l.to_dict() for l in recent_logs if "DOWNLOAD" in l.action]

    return jsonify({
        "files": [f.to_dict() for f in recent_files],
        "downloads": downloads,
        "activities": [log.to_dict() for log in recent_logs]
    }), 200

@file_bp.route("/api/search", methods=["GET"])
@jwt_required()
def search_vault():
    """
    Instant search logic querying files and folders.
    """
    user_id = int(get_jwt_identity())
    q = request.args.get("q", "").strip()
    file_type = request.args.get("type", "").strip()
    
    if not q and not file_type:
        return jsonify({"folders": [], "files": []}), 200

    # Build search query on files
    file_query = FileModel.query.filter_by(owner_id=user_id)
    if q:
        file_query = file_query.filter(FileModel.original_name.ilike(f"%{q}%"))
    if file_type:
        file_query = file_query.filter(FileModel.file_type == file_type)
        
    files = [f.to_dict() for f in file_query.all()]

    # Build search query on folders (folders only have a name, no type)
    folders = []
    if not file_type:
        folder_query = Folder.query.filter_by(owner_id=user_id)
        if q:
            folder_query = folder_query.filter(Folder.name.ilike(f"%{q}%"))
        folders = [f.to_dict() for f in folder_query.all()]

    return jsonify({"folders": folders, "files": files}), 200
