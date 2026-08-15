-- Run this ONCE on Hostinger phpMyAdmin against database `u636480992_ggs`
-- Creates the secret kill-switch control table used by /api/appcontrol/*

CREATE TABLE IF NOT EXISTS `app_control` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `passcode` varchar(10) NOT NULL DEFAULT '5887',
  `app_locked` varchar(10) NOT NULL DEFAULT 'false',
  `admin_secret` varchar(64) NOT NULL DEFAULT 'pg_x9k2_7f3a_q4m8_z3p8_fr0w',
  `locked_at` varchar(30) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO `app_control` (`id`, `passcode`, `app_locked`, `admin_secret`, `locked_at`)
VALUES (1, '5887', 'false', 'pg_x9k2_7f3a_q4m8_z3p8_fr0w', NULL)
ON DUPLICATE KEY UPDATE id = id;
