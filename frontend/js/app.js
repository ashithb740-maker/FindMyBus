const searchForm = document.getElementById('searchForm');
const searchInput = document.getElementById('searchInput');
const searchMessage = document.getElementById('searchMessage');
const plannerMessage = document.getElementById('plannerMessage');

searchForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const query = searchInput.value.trim();
  if (!query) {
    searchMessage.textContent = 'Enter a bus number, route, or stop to search.';
    searchInput.focus();
    return;
  }
  searchMessage.textContent = `Searching for “${query}” — live search will connect to the backend next.`;
});

document.querySelectorAll('[data-action]').forEach((button) => {
  button.addEventListener('click', () => {
    const action = button.dataset.action;
    const target = action === 'tracking' ? '#tracking' : action === 'planner' ? '#planner' : '#routes';
    document.querySelector(target)?.scrollIntoView({ behavior: 'smooth' });
  });
});

document.getElementById('planBtn').addEventListener('click', () => {
  const from = document.getElementById('fromInput').value.trim();
  const to = document.getElementById('toInput').value.trim();
  if (!from || !to) {
    plannerMessage.textContent = 'Enter both your starting point and destination.';
    return;
  }
  plannerMessage.textContent = `Planning a journey from ${from} to ${to}. Route results will connect to the backend next.`;
});

document.querySelector('.login-btn').addEventListener('click', () => {
  alert('Login and account features will be connected in the next development stage.');
});
