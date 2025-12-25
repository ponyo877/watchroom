-- Room Passwords

-- name: CreateRoomPassword :execresult
INSERT INTO room_passwords (room_id, password_hash) VALUES (?, ?);

-- name: GetRoomPassword :one
SELECT id, room_id, password_hash, created_at, updated_at
FROM room_passwords WHERE room_id = ?;

-- name: UpdateRoomPassword :exec
UPDATE room_passwords SET password_hash = ?, updated_at = CURRENT_TIMESTAMP WHERE room_id = ?;

-- name: DeleteRoomPassword :exec
DELETE FROM room_passwords WHERE room_id = ?;

-- name: HasPassword :one
SELECT EXISTS(SELECT 1 FROM room_passwords WHERE room_id = ?) as has_password;

-- Short URLs

-- name: CreateShortURL :execresult
INSERT INTO short_urls (short_id, room_id) VALUES (?, ?);

-- name: GetShortURL :one
SELECT id, short_id, room_id, created_at FROM short_urls WHERE short_id = ?;

-- name: GetShortURLByRoomID :one
SELECT id, short_id, room_id, created_at FROM short_urls WHERE room_id = ?;

-- name: DeleteShortURLByRoomID :exec
DELETE FROM short_urls WHERE room_id = ?;

-- Reports

-- name: CreateReport :execresult
INSERT INTO reports (room_id, reporter_id, target_id, message_text, reason, status)
VALUES (?, ?, ?, ?, ?, 'pending');

-- name: GetReport :one
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports WHERE id = ?;

-- name: ListReports :many
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports ORDER BY created_at DESC LIMIT ? OFFSET ?;

-- name: ListPendingReports :many
SELECT id, room_id, reporter_id, target_id, message_text, reason, status, created_at, updated_at
FROM reports WHERE status = 'pending' ORDER BY created_at DESC;

-- name: UpdateReportStatus :exec
UPDATE reports SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?;

-- Global Bans

-- name: CreateGlobalBan :execresult
INSERT INTO global_bans (user_id, reason, expires_at) VALUES (?, ?, ?);

-- name: GetGlobalBan :one
SELECT id, user_id, reason, banned_at, expires_at, created_at
FROM global_bans WHERE user_id = ?;

-- name: ListGlobalBans :many
SELECT id, user_id, reason, banned_at, expires_at, created_at
FROM global_bans ORDER BY banned_at DESC;

-- name: IsUserBanned :one
SELECT EXISTS(
    SELECT 1 FROM global_bans
    WHERE user_id = ? AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)
) as is_banned;

-- name: DeleteGlobalBan :exec
DELETE FROM global_bans WHERE user_id = ?;

-- name: DeleteExpiredBans :exec
DELETE FROM global_bans WHERE expires_at IS NOT NULL AND expires_at <= CURRENT_TIMESTAMP;
