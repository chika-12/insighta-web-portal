const BASE_URL = 'https://hngstage3-production.up.railway.app/api/v1';

function login() {
  window.location.href = `${BASE_URL}/auth/github`;
}
