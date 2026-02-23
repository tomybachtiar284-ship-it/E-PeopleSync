const pool = require('../db');

/**
 * Creates a notification for a specific user.
 * @param {number} userId - ID of the user to receive the notification.
 * @param {string} title - Brief title of the notification.
 * @param {string} message - Detailed message content.
 * @param {string} type - Category (e.g., 'leave', 'performance', 'learning', 'news').
 */
async function createNotification(userId, title, message, type = 'general') {
    try {
        await pool.query(
            `INSERT INTO notifications (user_id, title, message, type, is_read)
             VALUES ($1, $2, $3, $4, FALSE)`,
            [userId, title, message, type]
        );
        console.log(`🔔 Notification created for User ${userId}: ${title}`);
    } catch (err) {
        console.error('❌ Failed to create notification:', err.message);
    }
}

module.exports = { createNotification };
