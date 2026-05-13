-- Add the 'customer_last_chance_pickup' enum value for deduplication clarity
ALTER TYPE email_notification_type ADD VALUE IF NOT EXISTS 'customer_last_chance_pickup';

-- Reclassify existing last-chance records that were stored under the wrong type
UPDATE email_notifications_log
SET type = 'customer_last_chance_pickup'
WHERE type = 'customer_pickup_started';
