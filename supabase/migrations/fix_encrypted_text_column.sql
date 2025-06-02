-- Fix the encrypted_text column type and clear corrupted data
-- First, clear all existing corrupted data
DELETE FROM x_tweets;

-- Then alter the column type from BYTEA to TEXT
ALTER TABLE x_tweets ALTER COLUMN encrypted_text TYPE TEXT; 