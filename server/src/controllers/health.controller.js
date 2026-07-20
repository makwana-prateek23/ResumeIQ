export function getHealth(_req, res) {
  res.status(200).json({
    status: 'ok',
    service: 'resume-ats-checker-api'
  });
}
