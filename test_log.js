
(async () => {
    try {
        const fetch = require('node-fetch');
        const res = await fetch('http://localhost:3000/api/log-activity', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'copy_outreach',
                details: 'TEST_LOG_MANUAL_VERIFICATION'
            })
        });
        console.log('Log response:', res.status);
    } catch (e) {
        console.error('Log failed:', e);
    }
})();
