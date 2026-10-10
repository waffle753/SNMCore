ALTER TABLE student_information
  ADD COLUMN user_id BIGINT UNSIGNED NULL AFTER id,
  ADD UNIQUE KEY uq_student_information_user_id (user_id),
  ADD CONSTRAINT fk_student_information_user
    FOREIGN KEY (user_id) REFERENCES users (user_id)
    ON DELETE SET NULL;
