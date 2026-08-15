CREATE TABLE `email_batch_log` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `batch_type` varchar(50) NOT NULL,
  `created_at` datetime NOT NULL,
  `total_selected` int(11) NOT NULL DEFAULT 0,
  `sent_count` int(11) NOT NULL DEFAULT 0,
  `skipped_count` int(11) NOT NULL DEFAULT 0,
  `pending_ids` longtext NOT NULL DEFAULT '[]',
  `status` varchar(20) NOT NULL DEFAULT 'running',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
