const express = require('express');
const neo4j = require('neo4j-driver');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const uri = process.env.NEO4J_URI || 'bolt://neo4jserver:7687';
const user = process.env.NEO4J_USER || 'neo4j';
const password = process.env.NEO4J_PASSWORD || '080499Good';

const driver = neo4j.driver(uri, neo4j.auth.basic(user, password));

async function runQuery(cypher, params = {}) {
  const session = driver.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map((record) => record.toObject());
  } finally {
    await session.close();
  }
}

app.get('/usuarios', async (req, res) => {
  try {
    const data = await runQuery('MATCH (u:Usuario) RETURN u');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/productos', async (req, res) => {
  try {
    const data = await runQuery('MATCH (p:Producto) RETURN p');
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/pedidos', async (req, res) => {
  try {
    const cypher = `
      MATCH (c:Usuario)-[:REALIZA]->(o:Pedido)-[r:CONTIENTE]->(p:Producto)
      RETURN c, o, r, p
    `;
    const data = await runQuery(cypher);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/buscar-productos', async (req, res) => {
  const nombre = req.query.nombre || '';
  const cypher = `MATCH (p:Producto) WHERE p.nombre CONTAINS '${nombre}' RETURN p`;

  try {
    const data = await runQuery(cypher);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/pedidos/:id/actualizar-estado', async (req, res) => {
  const pedidoId = parseInt(req.params.id, 10);
  const nuevoEstado = req.body.estado;
  const rol = req.body.rol;

  if (rol !== 'vendedor') {
    return res.status(403).json({ error: 'Solo vendedores pueden actualizar pedidos' });
  }

  const cypher = `
    MATCH (o:Pedido {id: $pedidoId})
    SET o.estado = $nuevoEstado
    RETURN o
  `;

  try {
    const data = await runQuery(cypher, { pedidoId, nuevoEstado });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD USUARIOS

app.get('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = 'MATCH (u:Usuario {id: $id}) RETURN u';

  try {
    const data = await runQuery(cypher, { id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/usuarios', async (req, res) => {
  const { id, nombre, email, rol } = req.body;
  const cypher = `
    CREATE (u:Usuario {
      id: $id,
      nombre: $nombre,
      email: $email,
      rol: $rol,
      fecha_registro: date()
    })
    RETURN u
  `;

  try {
    const data = await runQuery(cypher, { id, nombre, email, rol });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { nombre, email, rol } = req.body;
  const cypher = `
    MATCH (u:Usuario {id: $id})
    SET u.nombre = $nombre,
        u.email = $email,
        u.rol = $rol
    RETURN u
  `;

  try {
    const data = await runQuery(cypher, { id, nombre, email, rol });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/usuarios/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = `
    MATCH (u:Usuario {id: $id})
    DETACH DELETE u
  `;

  try {
    await runQuery(cypher, { id });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD PRODUCTOS

app.get('/productos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = 'MATCH (p:Producto {id: $id}) RETURN p';

  try {
    const data = await runQuery(cypher, { id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/productos', async (req, res) => {
  const { id, nombre, precio, stock } = req.body;
  const cypher = `
    CREATE (p:Producto {
      id: $id,
      nombre: $nombre,
      precio: $precio,
      stock: $stock,
      fecha_publicacion: date()
    })
    RETURN p
  `;

  try {
    const data = await runQuery(cypher, { id, nombre, precio, stock });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/productos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { nombre, precio, stock } = req.body;
  const cypher = `
    MATCH (p:Producto {id: $id})
    SET p.nombre = $nombre,
        p.precio = $precio,
        p.stock = $stock
    RETURN p
  `;

  try {
    const data = await runQuery(cypher, { id, nombre, precio, stock });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/productos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = `
    MATCH (p:Producto {id: $id})
    DETACH DELETE p
  `;

  try {
    await runQuery(cypher, { id });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// CRUD PEDIDOS

app.get('/pedidos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = `
    MATCH (c:Usuario)-[:REALIZA]->(o:Pedido {id: $id})- [r:CONTIENTE]->(p:Producto)
    RETURN c, o, r, p
  `;

  try {
    const data = await runQuery(cypher, { id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/pedidos', async (req, res) => {
  const { id, clienteId, productos } = req.body;

  const cypher = `
    MATCH (c:Usuario {id: $clienteId})
    CREATE (o:Pedido {
      id: $id,
      estado: 'pendiente',
      fecha_pedido: date()
    })
    CREATE (c)-[:REALIZA]->(o)
    WITH o
    UNWIND $productos AS prod
    MATCH (p:Producto {id: prod.id})
    CREATE (o)-[:CONTIENTE {
      cantidad: prod.cantidad,
      precio_unitario: prod.precio_unitario
    }]->(p)
    RETURN o
  `;

  try {
    const data = await runQuery(cypher, { id, clienteId, productos });
    res.status(201).json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/pedidos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { estado } = req.body;
  const cypher = `
    MATCH (o:Pedido {id: $id})
    SET o.estado = $estado
    RETURN o
  `;

  try {
    const data = await runQuery(cypher, { id, estado });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/pedidos/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const cypher = `
    MATCH (o:Pedido {id: $id})
    DETACH DELETE o
  `;

  try {
    await runQuery(cypher, { id });
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`API escuchando en puerto ${port}`);
});

process.on('SIGINT', async () => {
  await driver.close();
  process.exit(0);
});
