-- WatchRoom Seed Data

-- 常設room (is_permanent = TRUE)
INSERT INTO rooms (room_id, name, creator_id, creator_name, is_active, is_permanent, member_count, created_at, updated_at)
VALUES
  ('permanent-1', '常設1', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-2', '常設2', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-3', '常設3', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-4', '常設4', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-5', '常設5', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-6', '常設6', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-7', '常設7', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW()),
  ('permanent-8', '常設8', 'system', 'System', TRUE, TRUE, 0, NOW(), NOW());

-- 常設roomの短縮URL (固定: /r/p1 ~ /r/p8)
INSERT INTO short_urls (short_id, room_id, created_at)
VALUES
  ('p1', 'permanent-1', NOW()),
  ('p2', 'permanent-2', NOW()),
  ('p3', 'permanent-3', NOW()),
  ('p4', 'permanent-4', NOW()),
  ('p5', 'permanent-5', NOW()),
  ('p6', 'permanent-6', NOW()),
  ('p7', 'permanent-7', NOW()),
  ('p8', 'permanent-8', NOW());
