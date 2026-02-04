const API_BASE = 'https://api.escuelajs.co/api/v1';

let allProducts = [];
let filteredProducts = [];
let currentPage = 1;
let perPage = 10;
let sortTitleOrder = 'none';
let sortPriceOrder = 'none';

const tbody = document.getElementById('tbody');
const searchTitle = document.getElementById('searchTitle');
const perPageSelect = document.getElementById('perPage');
const paginationEl = document.getElementById('pagination');
const paginationInfo = document.getElementById('paginationInfo');
const sortTitleEl = document.getElementById('sortTitle');
const sortPriceEl = document.getElementById('sortPrice');
const btnExportCsv = document.getElementById('btnExportCsv');
const modalDetail = new bootstrap.Modal(document.getElementById('modalDetail'));
const detailEditForm = document.getElementById('detailEditForm');
const modalCreate = new bootstrap.Modal(document.getElementById('modalCreate'));

async function fetchProducts() {
  const res = await fetch(`${API_BASE}/products`);
  if (!res.ok) throw new Error('Lỗi tải sản phẩm');
  return res.json();
}

async function fetchCategories() {
  const res = await fetch(`${API_BASE}/categories`);
  if (!res.ok) return [];
  return res.json();
}

async function loadCategories() {
  const categories = await fetchCategories();
  const select = document.getElementById('createCategoryId');
  select.innerHTML = '<option value="">-- Chọn category --</option>';
  categories.forEach(c => {
    select.innerHTML += `<option value="${c.id}">${c.name}</option>`;
  });
}

function applySort(data) {
  let list = [...data];
  if (sortTitleOrder === 'asc') list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  if (sortTitleOrder === 'desc') list.sort((a, b) => (b.title || '').localeCompare(a.title || ''));
  if (sortPriceOrder === 'asc') list.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
  if (sortPriceOrder === 'desc') list.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
  return list;
}

function filterByTitle() {
  const q = (searchTitle.value || '').trim().toLowerCase();
  if (!q) {
    filteredProducts = [...allProducts];
  } else {
    filteredProducts = allProducts.filter(p => (p.title || '').toLowerCase().includes(q));
  }
  filteredProducts = applySort(filteredProducts);
  currentPage = 1;
  render();
}

function getPageData() {
  const start = (currentPage - 1) * perPage;
  return filteredProducts.slice(start, start + perPage);
}

function escapeHtml(s) {
  if (s == null) return '';
  const div = document.createElement('div');
  div.textContent = s;
  return div.innerHTML;
}

function renderTable() {
  const pageData = getPageData();
  if (pageData.length === 0) {
    tbody.innerHTML = '<tr><td colspan="5" class="text-center py-5 text-muted">Không có dữ liệu</td></tr>';
    return;
  }
  tbody.innerHTML = pageData.map(p => {
    const desc = (p.description || '').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const categoryName = p.category ? p.category.name : '—';
    const imgs = Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []);
    const imagesHtml = imgs.slice(0, 3).map(url =>
      `<img src="${url}" alt="" class="thumb-img me-1" onerror="this.src='https://placehold.co/48x48?text=Err'">`
    ).join('');
    return `
      <tr class="table-row-hover tooltip-desc" data-id="${p.id}" title="Click để xem chi tiết">
        <td>${p.id}</td>
        <td>${escapeHtml(p.title || '')}<span class="tooltip-desc-text">${desc || 'Không có mô tả'}</span></td>
        <td>${typeof p.price === 'number' ? p.price.toLocaleString() : p.price}</td>
        <td>${escapeHtml(categoryName)}</td>
        <td>${imagesHtml || '—'}</td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('.table-row-hover').forEach(tr => {
    tr.addEventListener('click', () => openDetail(Number(tr.dataset.id)));
  });
}

function renderPagination() {
  const total = filteredProducts.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (currentPage - 1) * perPage + 1;
  const end = Math.min(currentPage * perPage, total);

  paginationInfo.textContent = total === 0
    ? 'Không có dữ liệu'
    : `Hiển thị ${start}–${end} / ${total} sản phẩm`;

  let html = '';
  if (currentPage > 1) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage - 1}">Trước</a></li>`;
  }
  for (let i = 1; i <= totalPages; i++) {
    const active = i === currentPage ? ' active' : '';
    html += `<li class="page-item${active}"><a class="page-link" href="#" data-page="${i}">${i}</a></li>`;
  }
  if (currentPage < totalPages) {
    html += `<li class="page-item"><a class="page-link" href="#" data-page="${currentPage + 1}">Sau</a></li>`;
  }
  paginationEl.innerHTML = html;

  paginationEl.querySelectorAll('a[data-page]').forEach(a => {
    a.addEventListener('click', e => {
      e.preventDefault();
      currentPage = Number(a.dataset.page);
      render();
    });
  });
}

function updateSortIcons() {
  sortTitleEl.classList.remove('bi-arrow-down', 'bi-arrow-up', 'bi-arrow-down-up', 'active');
  sortPriceEl.classList.remove('bi-arrow-down', 'bi-arrow-up', 'bi-arrow-down-up', 'active');
  sortTitleEl.classList.add(sortTitleOrder === 'asc' ? 'bi-arrow-up' : sortTitleOrder === 'desc' ? 'bi-arrow-down' : 'bi-arrow-down-up');
  sortPriceEl.classList.add(sortPriceOrder === 'asc' ? 'bi-arrow-up' : sortPriceOrder === 'desc' ? 'bi-arrow-down' : 'bi-arrow-down-up');
  if (sortTitleOrder !== 'none') sortTitleEl.classList.add('active');
  if (sortPriceOrder !== 'none') sortPriceEl.classList.add('active');
}

function render() {
  renderTable();
  renderPagination();
  updateSortIcons();
}

function exportCurrentViewToCsv() {
  const pageData = getPageData();
  if (pageData.length === 0) {
    alert('Không có dữ liệu để export.');
    return;
  }
  const headers = ['id', 'title', 'price', 'category', 'images', 'description'];
  const rows = pageData.map(p => {
    const cat = p.category ? p.category.name : '';
    const imgs = Array.isArray(p.images) ? p.images.join('; ') : (p.images || '');
    const desc = (p.description || '').replace(/"/g, '""');
    return [p.id, `"${(p.title || '').replace(/"/g, '""')}"`, p.price, `"${cat.replace(/"/g, '""')}"`, `"${imgs}"`, `"${desc}"`];
  });
  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `products_page${currentPage}_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
}

function openDetail(id) {
  const p = allProducts.find(x => x.id === id) || filteredProducts.find(x => x.id === id);
  if (!p) return;
  document.getElementById('detailId').textContent = p.id;
  document.getElementById('detailTitle').textContent = p.title || '—';
  document.getElementById('detailPrice').textContent = typeof p.price === 'number' ? p.price.toLocaleString() : p.price;
  document.getElementById('detailCategory').textContent = p.category ? p.category.name : '—';
  document.getElementById('detailDescription').textContent = p.description || '—';
  const imgs = Array.isArray(p.images) ? p.images : (p.images ? [p.images] : []);
  document.getElementById('detailImage').src = imgs[0] || 'https://placehold.co/400x200?text=No+image';
  document.getElementById('detailImage').alt = p.title || '';

  document.getElementById('editId').value = p.id;
  document.getElementById('editTitle').value = p.title || '';
  document.getElementById('editPrice').value = p.price ?? '';
  document.getElementById('editDescription').value = p.description || '';
  detailEditForm.classList.add('d-none');
  document.getElementById('btnEdit').classList.remove('d-none');
  modalDetail.show();
}

async function saveEdit() {
  const id = document.getElementById('editId').value;
  const title = document.getElementById('editTitle').value.trim();
  const price = parseFloat(document.getElementById('editPrice').value);
  const description = document.getElementById('editDescription').value.trim();
  if (!title || isNaN(price)) {
    alert('Title và Price không hợp lệ.');
    return;
  }
  try {
    const res = await fetch(`${API_BASE}/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price, description })
    });
    if (!res.ok) throw new Error(await res.text());
    const updated = await res.json();
    const idx = allProducts.findIndex(p => p.id === parseInt(id, 10));
    if (idx !== -1) allProducts[idx] = { ...allProducts[idx], ...updated };
    filterByTitle();
    detailEditForm.classList.add('d-none');
    document.getElementById('btnEdit').classList.remove('d-none');
    modalDetail.hide();
  } catch (e) {
    alert('Cập nhật thất bại: ' + e.message);
  }
}

async function submitCreate() {
  const title = document.getElementById('createTitle').value.trim();
  const price = parseFloat(document.getElementById('createPrice').value);
  const description = document.getElementById('createDescription').value.trim();
  const categoryId = document.getElementById('createCategoryId').value;
  const imagesText = document.getElementById('createImages').value.trim();
  const images = imagesText ? imagesText.split(/\r?\n/).map(s => s.trim()).filter(Boolean) : [];

  if (!title || isNaN(price) || !description || !categoryId || images.length === 0) {
    alert('Vui lòng điền đủ: Title, Price, Description, Category và ít nhất 1 URL ảnh.');
    return;
  }

  try {
    const res = await fetch(`${API_BASE}/products/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, price, description, categoryId: Number(categoryId), images })
    });
    if (!res.ok) throw new Error(await res.text());
    const created = await res.json();
    allProducts.unshift(created);
    filterByTitle();
    document.getElementById('createTitle').value = '';
    document.getElementById('createPrice').value = '';
    document.getElementById('createDescription').value = '';
    document.getElementById('createImages').value = '';
    modalCreate.hide();
  } catch (e) {
    alert('Tạo sản phẩm thất bại: ' + e.message);
  }
}

function init() {
  searchTitle.addEventListener('input', filterByTitle);
  searchTitle.addEventListener('change', filterByTitle);

  perPageSelect.addEventListener('change', () => {
    perPage = parseInt(perPageSelect.value, 10);
    currentPage = 1;
    render();
  });

  sortTitleEl.addEventListener('click', () => {
    sortPriceOrder = 'none';
    sortTitleOrder = sortTitleOrder === 'none' ? 'asc' : sortTitleOrder === 'asc' ? 'desc' : 'none';
    filterByTitle();
  });
  sortPriceEl.addEventListener('click', () => {
    sortTitleOrder = 'none';
    sortPriceOrder = sortPriceOrder === 'none' ? 'asc' : sortPriceOrder === 'asc' ? 'desc' : 'none';
    filterByTitle();
  });

  btnExportCsv.addEventListener('click', exportCurrentViewToCsv);

  document.getElementById('btnEdit').addEventListener('click', () => {
    detailEditForm.classList.remove('d-none');
    document.getElementById('btnEdit').classList.add('d-none');
  });
  document.getElementById('btnSaveEdit').addEventListener('click', saveEdit);
  document.getElementById('btnCancelEdit').addEventListener('click', () => {
    detailEditForm.classList.add('d-none');
    document.getElementById('btnEdit').classList.remove('d-none');
  });

  document.getElementById('btnSubmitCreate').addEventListener('click', submitCreate);
}

(async () => {
  try {
    await loadCategories();
    allProducts = await fetchProducts();
    filteredProducts = applySort([...allProducts]);
    render();
    init();
  } catch (e) {
    tbody.innerHTML = `<tr><td colspan="5" class="text-center py-5 text-danger">Lỗi: ${e.message}</td></tr>`;
  }
})();
