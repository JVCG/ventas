import express from 'express';
import mysql from 'mysql2/promise';
import cors from 'cors';

const app = express();

// --- CAMBIO 1: Configuración de CORS más segura ---
// Por ahora, para pruebas, puedes dejarlo abierto, pero antes de terminar,
// deberías restringirlo a la URL de tu frontend en Hostinger.
const corsOptions = {
  // EJEMPLO PARA PRODUCCIÓN FINAL:
  origin: 'https://ventas.izipetperu.com', 'http://localhost:5173', 
  //origin: '*', // Déjalo así por ahora para probar fácilmente
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));
app.use(express.json());

// --- CAMBIO 2: Conexión a la base de datos con Variables de Entorno ---
// ¡NUNCA pongas credenciales directamente en el código!
// Render te proporcionará una "Connection String" que pondremos en las variables de entorno.
//const db = await mysql.createPool(process.env.DATABASE_URL);
const db = await mysql.createPool({
				  host: process.env.DB_HOST,
				  user: process.env.DB_USER,
				  password: process.env.DB_PASSWORD,
				  database: process.env.DB_NAME,
				  waitForConnections: true,
				  connectionLimit: 10,
				  queueLimit: 0
				});


// ===== VENTAS =====

// Obtener todas las ventas (sin cambios)
app.get('/api/sales', async (req, res) => {
    try {
        // Añadimos el cálculo del total directamente en la consulta SQL
        const [rows] = await db.query('SELECT *, (quantity * unitPrice) as total FROM ventas ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener ventas' });
    }
});

// Guardar una venta
app.post('/api/sales', async (req, res) => {
    try {
        const { date, product, quantity, unitPrice, client, dni, phone, email, paymentMethod } = req.body;
        
        // --- CAMBIO 3: Devolver la venta creada al frontend ---
        const [result] = await db.query(
            `INSERT INTO ventas (date, product, quantity, unitPrice, client, dni, phone, email, paymentMethod)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [date, product, quantity, unitPrice, client, dni, phone, email, paymentMethod]
        );
        
        // Obtenemos el ID de la venta que acabamos de insertar
        const insertId = result.insertId;

        // Consultamos la base de datos para obtener el registro completo que acabamos de crear
        const [newSale] = await db.query('SELECT *, (quantity * unitPrice) as total FROM ventas WHERE id = ?', [insertId]);

        // Devolvemos el objeto completo. El frontend lo necesita.
        res.status(201).json(newSale[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar venta' });
    }
});

// ===== COMPRAS =====

// Obtener todas las compras (sin cambios)
app.get('/api/purchases', async (req, res) => {
    try {
        // Añadimos el cálculo del total directamente en la consulta SQL
        const [rows] = await db.query('SELECT *, (quantity * unitPrice) as total FROM compras ORDER BY created_at DESC');
        res.json(rows);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al obtener compras' });
    }
});

// Guardar una compra
app.post('/api/purchases', async (req, res) => {
    try {
        const { date, product, quantity, unitPrice, provider, paymentMethod } = req.body;
        
        // --- CAMBIO 3 (Aplicado también aquí): Devolver la compra creada ---
        const [result] = await db.query(
            `INSERT INTO compras (date, product, quantity, unitPrice, provider, paymentMethod)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [date, product, quantity, unitPrice, provider, paymentMethod]
        );
        
        const insertId = result.insertId;
        const [newPurchase] = await db.query('SELECT *, (quantity * unitPrice) as total FROM compras WHERE id = ?', [insertId]);
        
        res.status(201).json(newPurchase[0]);

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Error al guardar compra' });
    }
});


// --- CAMBIO 4: Usar el puerto dinámico de Render ---
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor corriendo en el puerto ${PORT}`);
});