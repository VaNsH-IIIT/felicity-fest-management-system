const https = require('https');

/**
 * Middleware to verify Google reCAPTCHA v2 token.
 * Expects req.body.captchaToken to be present.
 * Uses RECAPTCHA_SECRET_KEY from env (falls back to Google's test secret key).
 */
const verifyCaptcha = async (req, res, next) => {
  const { captchaToken } = req.body;

  if (!captchaToken) {
    return res.status(400).json({ message: 'CAPTCHA token is required' });
  }

  const secretKey = process.env.RECAPTCHA_SECRET_KEY || '6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe';

  try {
    const result = await new Promise((resolve, reject) => {
      const postData = `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(captchaToken)}`;

      const options = {
        hostname: 'www.google.com',
        path: '/recaptcha/api/siteverify',
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(postData)
        }
      };

      const request = https.request(options, (response) => {
        let data = '';
        response.on('data', (chunk) => { data += chunk; });
        response.on('end', () => {
          try {
            resolve(JSON.parse(data));
          } catch (e) {
            reject(new Error('Failed to parse CAPTCHA response'));
          }
        });
      });

      request.on('error', reject);
      request.write(postData);
      request.end();
    });

    if (!result.success) {
      return res.status(400).json({ message: 'CAPTCHA verification failed. Please try again.' });
    }

    next();
  } catch (error) {
    console.error('CAPTCHA verification error:', error);
    return res.status(500).json({ message: 'CAPTCHA verification error' });
  }
};

module.exports = verifyCaptcha;
