const BASE_URL = 'https://hngintern-production-7bfd.up.railway.app/api/v1';

let currentPage = 1;

async function loadProfiles(page = 1) {
  try {
    const res = await fetch(`${BASE_URL}/profiles?page=${page}`, {
      credentials: 'include',
    });

    if (res.status === 401) {
      window.location.href = '/index.html';
      return;
    }

    const data = await res.json();

    displayProfiles(data.data);
    currentPage = data.page;
  } catch (err) {
    console.error(err);
  }
}

function displayProfiles(profiles) {
  const container = document.getElementById('profiles');

  container.innerHTML = profiles
    .map(
      (p) => `
    <div class="card mb-2 p-2">
      <h5>${p.name || 'No Name'}</h5>
      <p>Gender: ${p.gender}</p>
      <p>Country: ${p.country_id}</p>
      <p>Age: ${p.age}</p>
    </div>
  `
    )
    .join('');
}

async function searchProfiles() {
  const query = document.getElementById('search').value;

  const res = await fetch(`${BASE_URL}/profiles/search?q=${query}`, {
    credentials: 'include',
  });

  const data = await res.json();
  displayProfiles(data.data);
}

function exportCSV() {
  window.location.href = `${BASE_URL}/profiles/export`;
}

async function logout() {
  await fetch(`${BASE_URL}/auth/logout`, {
    method: 'POST',
    credentials: 'include',
  });

  window.location.href = '/index.html';
}

function nextPage() {
  loadProfiles(currentPage + 1);
}

function prevPage() {
  if (currentPage > 1) {
    loadProfiles(currentPage - 1);
  }
}

loadProfiles();
