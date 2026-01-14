const API_BASE = localStorage.getItem('API_BASE') || 'http://localhost:3000';

const apiBaseLabel = document.getElementById('api-base-label');
if (apiBaseLabel) {
  apiBaseLabel.textContent = API_BASE;
}

async function callApi(path, params = {}) {
  const url = new URL(path, API_BASE);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      url.searchParams.set(key, value);
    }
  });

  const response = await fetch(url.toString());
  const contentType = response.headers.get('content-type') || '';

  if (!response.ok) {
    let errorBody;
    if (contentType.includes('application/json')) {
      errorBody = await response.json();
    } else {
      errorBody = await response.text();
    }
    throw new Error(`Error ${response.status}: ${JSON.stringify(errorBody)}`);
  }

  if (contentType.includes('application/json')) {
    return response.json();
  }
  return response.text();
}

function renderResult(elementId, data) {
  const el = document.getElementById(elementId);
  if (!el) return;
  el.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
}

function attachForms() {
  // Catálogo general: GET /productos
  const btnCargarProductos = document.getElementById('btn-cargar-productos');
  const gridProductos = document.getElementById('grid-productos');
  const debugProductos = document.getElementById('debug-productos');

  async function cargarCatalogo() {
    if (!gridProductos) return;
    gridProductos.innerHTML = '<span class="loading">Cargando productos...</span>';
    try {
      const data = await callApi('/productos');
      if (debugProductos) {
        debugProductos.textContent = JSON.stringify(data, null, 2);
      }

      const productos = Array.isArray(data)
        ? data.map((r) => r.p || r.p0 || r)
        : [];

      if (!productos.length) {
        gridProductos.innerHTML = '<span class="empty">No se encontraron productos.</span>';
        return;
      }

      gridProductos.innerHTML = '';
      productos.forEach((p) => {
        const props = p.properties || p;
        const card = document.createElement('article');
        card.className = 'product-card';
        card.innerHTML = `
          <div class="product-main">
            <h3 class="product-name">${props.nombre ?? 'Producto sin nombre'}</h3>
            <p class="product-price">$${props.precio ?? '—'}</p>
          </div>
          <p class="product-meta">ID: ${props.id ?? 'N/D'} · Stock: ${props.stock ?? 'N/D'}</p>
        `;
        gridProductos.appendChild(card);
      });
    } catch (err) {
      gridProductos.innerHTML = `<span class="error">${err.message}</span>`;
    }
  }

  if (btnCargarProductos) {
    btnCargarProductos.addEventListener('click', (e) => {
      e.preventDefault();
      cargarCatalogo();
    });
  }

  // Búsqueda principal de productos: GET /buscar-productos
  const formBuscarProductos = document.getElementById('form-buscar-productos');
  if (formBuscarProductos) {
    formBuscarProductos.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formBuscarProductos);
      const nombre = formData.get('nombre') || '';
      if (!gridProductos) return;
      gridProductos.innerHTML = '<span class="loading">Buscando...</span>';
      try {
        const data = await callApi('/buscar-productos', { nombre });
        if (debugProductos) {
          debugProductos.textContent = JSON.stringify(data, null, 2);
        }

        const productos = Array.isArray(data)
          ? data.map((r) => r.p || r.p0 || r)
          : [];

        if (!productos.length) {
          gridProductos.innerHTML = '<span class="empty">No se encontraron productos.</span>';
          return;
        }

        gridProductos.innerHTML = '';
        productos.forEach((p) => {
          const props = p.properties || p;
          const card = document.createElement('article');
          card.className = 'product-card';
          card.innerHTML = `
            <div class="product-main">
              <h3 class="product-name">${props.nombre ?? 'Producto sin nombre'}</h3>
              <p class="product-price">$${props.precio ?? '—'}</p>
            </div>
            <p class="product-meta">ID: ${props.id ?? 'N/D'} · Stock: ${props.stock ?? 'N/D'}</p>
          `;
          gridProductos.appendChild(card);
        });
      } catch (err) {
        gridProductos.innerHTML = `<span class="error">${err.message}</span>`;
      }
    });
  }

  const formBuscarUsuarios = document.getElementById('form-buscar-usuarios');
  if (formBuscarUsuarios) {
    formBuscarUsuarios.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formBuscarUsuarios);
      const nombre = formData.get('nombre') || '';
      try {
        const data = await callApi('/buscar-usuarios-inseguro', { nombre });
        renderResult('resultado-buscar-usuarios', data);
      } catch (err) {
        renderResult('resultado-buscar-usuarios', err.message);
      }
    });
  }

  const formLoginInseguro = document.getElementById('form-login-inseguro');
  if (formLoginInseguro) {
    formLoginInseguro.addEventListener('submit', async (e) => {
      e.preventDefault();
      const formData = new FormData(formLoginInseguro);
      const password = formData.get('password') || '';
      try {
        const data = await callApi('/login-inseguro', { password });
        renderResult('resultado-login-inseguro', data);
      } catch (err) {
        renderResult('resultado-login-inseguro', err.message);
      }
    });
  }

}

window.addEventListener('DOMContentLoaded', attachForms);
