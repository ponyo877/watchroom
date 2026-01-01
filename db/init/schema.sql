-- WatchRoom Database Schema

-- 部屋管理
CREATE TABLE IF NOT EXISTS rooms (
    id                      INT PRIMARY KEY AUTO_INCREMENT,
    room_id                 VARCHAR(255) NOT NULL UNIQUE COMMENT 'SkyWay Room ID',
    name                    VARCHAR(255) NOT NULL COMMENT '部屋名',
    creator_id              VARCHAR(255) NOT NULL COMMENT '作成者のユーザーID',
    creator_name            VARCHAR(255) NOT NULL COMMENT '作成者名',
    is_active               BOOLEAN DEFAULT TRUE COMMENT 'アクティブかどうか',
    current_video_id        VARCHAR(255) NULL COMMENT '現在再生中の動画ID',
    current_video_title     VARCHAR(500) NULL COMMENT '現在再生中の動画タイトル',
    current_video_thumbnail VARCHAR(500) NULL COMMENT '現在再生中の動画サムネイル',
    member_count            INT DEFAULT 0 COMMENT '現在の参加人数',
    max_members             INT DEFAULT 10 COMMENT '最大参加人数',
    created_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_room_id (room_id),
    INDEX idx_is_active (is_active),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 部屋パスワード管理
CREATE TABLE IF NOT EXISTS room_passwords (
    id            INT PRIMARY KEY AUTO_INCREMENT,
    room_id       VARCHAR(255) NOT NULL UNIQUE COMMENT 'SkyWay Room ID',
    password_hash VARCHAR(255) NOT NULL COMMENT 'bcryptハッシュ',
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 短縮URL管理
CREATE TABLE IF NOT EXISTS short_urls (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    short_id   VARCHAR(8) NOT NULL UNIQUE COMMENT '6-8文字の英数字',
    room_id    VARCHAR(255) NOT NULL COMMENT 'SkyWay Room ID',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_short_id (short_id),
    INDEX idx_room_id (room_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 通報管理
CREATE TABLE IF NOT EXISTS reports (
    id           INT PRIMARY KEY AUTO_INCREMENT,
    room_id      VARCHAR(255) NOT NULL COMMENT 'SkyWay Room ID',
    reporter_id  VARCHAR(255) NOT NULL COMMENT '通報者のユーザーID',
    target_id    VARCHAR(255) NOT NULL COMMENT '対象者のユーザーID',
    message_text TEXT NOT NULL COMMENT '通報対象メッセージ',
    reason       VARCHAR(255) NOT NULL COMMENT '通報理由',
    status       VARCHAR(50) NOT NULL DEFAULT 'pending' COMMENT 'pending/reviewed/resolved',
    created_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_status (status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 全体BAN管理
CREATE TABLE IF NOT EXISTS global_bans (
    id         INT PRIMARY KEY AUTO_INCREMENT,
    user_id    VARCHAR(255) NOT NULL UNIQUE COMMENT 'ユーザーID (localStorage UUID)',
    reason     TEXT NOT NULL COMMENT 'BAN理由',
    banned_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP NULL COMMENT 'NULL = 永久BAN',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_user_id (user_id),
    INDEX idx_expires_at (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
