-- Course and Section Management Tables
-- This script creates the necessary tables for course-section management and group chats

USE studynest;

-- Table for academic terms/trimesters
CREATE TABLE IF NOT EXISTS academic_terms (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  term_name VARCHAR(100) NOT NULL,
  term_code VARCHAR(20) NOT NULL UNIQUE,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_active BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_term_code (term_code),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for course sections (extends existing courses table)
CREATE TABLE IF NOT EXISTS course_sections (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  course_id INT UNSIGNED NOT NULL,
  section_name VARCHAR(10) NOT NULL, -- A, B, C, etc.
  term_id INT UNSIGNED NOT NULL,
  instructor_name VARCHAR(255) NULL,
  max_students INT UNSIGNED DEFAULT 50,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_course_section_term (course_id, section_name, term_id),
  FOREIGN KEY (course_id) REFERENCES courses(id) ON DELETE CASCADE,
  FOREIGN KEY (term_id) REFERENCES academic_terms(id) ON DELETE CASCADE,
  INDEX idx_course_id (course_id),
  INDEX idx_term_id (term_id),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group chats (extends existing conversations table)
CREATE TABLE IF NOT EXISTS group_chats (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  chat_name VARCHAR(255) NOT NULL,
  course_section_id INT UNSIGNED NOT NULL,
  description TEXT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (course_section_id) REFERENCES course_sections(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_course_section_id (course_section_id),
  INDEX idx_created_by (created_by),
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group chat participants
CREATE TABLE IF NOT EXISTS group_chat_participants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_chat_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  is_admin BOOLEAN DEFAULT FALSE,
  UNIQUE KEY unique_chat_user (group_chat_id, user_id),
  FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_group_chat_id (group_chat_id),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group chat messages (extends existing messages table)
CREATE TABLE IF NOT EXISTS group_chat_messages (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  group_chat_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  message_type ENUM('text', 'file', 'image', 'system') DEFAULT 'text',
  body TEXT NULL,
  attachment_url VARCHAR(1024) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_group_chat_id (group_chat_id, created_at),
  INDEX idx_sender_id (sender_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Table for group chat message reads
CREATE TABLE IF NOT EXISTS group_chat_message_reads (
  group_chat_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  last_read_message_id BIGINT UNSIGNED NOT NULL DEFAULT 0,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (group_chat_id, user_id),
  FOREIGN KEY (group_chat_id) REFERENCES group_chats(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default academic term
INSERT INTO academic_terms (term_name, term_code, start_date, end_date, is_active) 
VALUES ('Fall 2024', 'FALL2024', '2024-09-01', '2024-12-15', TRUE)
ON DUPLICATE KEY UPDATE term_name = VALUES(term_name);

-- Add role and status columns to users table if they don't exist
ALTER TABLE users ADD COLUMN IF NOT EXISTS role ENUM('User', 'Admin', 'Instructor') DEFAULT 'User';
ALTER TABLE users ADD COLUMN IF NOT EXISTS status ENUM('Active', 'Banned', 'Suspended') DEFAULT 'Active';

