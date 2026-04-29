const BASE_URL = 'https://hngintern-production-7bfd.up.railway.app/api/v1';

function login() {
  window.location.href = `${BASE_URL}/auth/github`;
}
