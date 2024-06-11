const express = require('express');
const mysql = require('mysql2');
const app = express();
const port = 3000;
const cors = require('cors');
app.use(cors());

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Configuración de la conexión a la base de datos

/*const connection = mysql.createConnection({
  host: '172.16.153.143',
  port: 3306,
  user: 'adminfabian',
  password: 'fabian123',
  database: 'ProyBD'
});*/

const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'admin',
    database: 'proyecto_base'
});

// Conectar a la base de datos
connection.connect(err => {
    if (err) {
        console.error('Error conectando a la base de datos:', err);
        return;
    }
    console.log('Conectado a la base de datos.');
});

// Ruta genérica para ejecutar una consulta SQL
const executeQuery = (res, query) => {
    connection.query(query, (err, results) => {
        if (err) {
            res.status(500).send(err);
        } else {
            res.json(results);
        }
    });
};

// Definir rutas para cada tabla
app.get('/usuario', (req, res) => {
    executeQuery(res, 'SELECT * FROM usuario');
});

app.get('/paciente', (req, res) => {
    executeQuery(res, 'SELECT * FROM usuario JOIN paciente ON usuario.id = paciente.id_usuario');
});

app.get('/doctor', (req, res) => {
    executeQuery(res, 'SELECT * FROM usuario JOIN doctor ON usuario.id = doctor.id_usuario');
});

app.get('/administrador', (req, res) => {
    executeQuery(res, 'SELECT * FROM usuario JOIN administrador ON usuario.id = administrador.id_usuario');
});

app.get('/medicamento', (req, res) => {
    executeQuery(res, 'SELECT * FROM medicamento');
});

app.get('/alergia', (req, res) => {
    executeQuery(res, 'SELECT * FROM alergia');
});

app.get('/enfermedad', (req, res) => {
    executeQuery(res, 'SELECT * FROM enfermedad');
});

app.get('/expediente', (req, res) => {
    executeQuery(res, 'SELECT * FROM expediente');
});

// Obtener nombre de paciente, fecha, nombre enfermedad y descripción de enfermedad
app.get('/expediente_medicamento/:idDoctor', (req, res) => {
    const idDoctor = req.params.idDoctor;
    const query = `
      SELECT 
          u.nombre AS paciente, 
          DATE_FORMAT(e.fecha, '%Y-%m-%d') AS fecha,
          en.nombre AS enfermedad, 
          e.descripcion AS descripcion
      FROM 
          expediente_medicamento em
      JOIN 
          expediente e ON em.expediente_id = e.id 
      JOIN 
          enfermedad en ON en.id = e.id_enfermedad
      JOIN 
          paciente p ON e.id_paciente = p.id
      JOIN 
          usuario u ON p.id_usuario = u.id
      WHERE 
          e.id_doctor = ?;
    `;
  
    connection.query(query, [idDoctor], (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).send({ message: 'Error interno del servidor' });
      }
      res.status(200).send(results);
    });
  });

// Obtener nombre de paciente, fecha, hora, fecha y estado de la cita
app.get('/cita/:idDoctor', (req, res) => {
    const idDoctor = req.params.idDoctor;
    const query = `
      SELECT 
          u.nombre AS paciente, 
          u.apellido_p AS apellido_p,
          DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha, 
          c.hora AS hora, 
          c.estado AS estado
      FROM 
          cita c
      JOIN 
          paciente p ON c.id_paciente = p.id
      JOIN 
          usuario u ON p.id_usuario = u.id
      WHERE 
          c.id_doctor = ?;
    `;

    connection.query(query, [idDoctor], (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).send({ message: 'Error interno del servidor' });
      }
      res.status(200).send(results);
    });
});


app.get('/cita_paciente/:idPaciente', (req, res) => {
    const idPaciente = req.params.idPaciente;
    const query = `
        SELECT
            u.nombre AS nombre,
            u.apellido_p AS apellido_P,
            c.hora AS hora,
            DATE_FORMAT(c.fecha, '%Y-%m-%d') AS fecha,
            c.estado AS estado
        FROM
            cita c
        JOIN
            doctor d ON c.id_doctor = d.id
        JOIN
            usuario u ON d.id_usuario = u.id
        WHERE 
            c.id_paciente = ?;
    `;
  
    connection.query(query, [idPaciente], (err, results) => {
      if (err) {
        console.error('Error en la consulta:', err);
        return res.status(500).send({ message: 'Error interno del servidor' });
      }
      res.status(200).send(results);
    });
  });
  

app.get('/paciente_alergia', (req, res) => {
    executeQuery(res, 'SELECT id_paciente, a.nombre, a.descripcion FROM paciente_alergia JOIN alergia AS a ON paciente_alergia.id_alergia = a.id');
});

// Ruta para registrar un nuevo usuario
app.post('/registro', (req, res) => {
    const { id, nombre, apellido_P, apellido_m, direccion, telefono, correo, contrasena } = req.body;
    
    // Primero, insertamos el nuevo usuario en la tabla de usuarios
    const usuarioQuery = `INSERT INTO usuario (id, nombre, apellido_P, apellido_m, direccion, telefono, correo, contrasena) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`;
    connection.query(usuarioQuery, [id, nombre, apellido_P, apellido_m, direccion, telefono, correo, contrasena], (err, usuarioResults) => {
        if (err) {
            return res.status(500).send(err);
        }
        
        // Luego, obtenemos el ID del nuevo usuario insertado
        const nuevoUsuarioId = usuarioResults.insertId;
        
        // Después, insertamos automáticamente el nuevo usuario en la tabla de pacientes
        const pacienteQuery = `INSERT INTO paciente (id_usuario) VALUES (?)`;
        connection.query(pacienteQuery, [nuevoUsuarioId], (err, pacienteResults) => {
            if (err) {
                return res.status(500).send(err);
            }
            
            // Si todo salió bien, respondemos con un mensaje de éxito
            res.status(201).send({ message: 'Usuario y paciente registrados exitosamente.' });
        });
    });
});


// Ruta para iniciar sesión
app.post('/login', (req, res) => {
    console.log("Peticion: ", req.body);

    if (!req.body || !req.body.correo || !req.body.contrasena) {
        console.log("Error en la peticion");
        return res.status(400).send({ message: 'Correo y contraseña son requeridos' });
    }

    const { correo, contrasena } = req.body;

    const query = `
      SELECT 
        u.id,
        u.nombre,
        u.apellido_P,
        u.apellido_m,
        u.direccion,
        u.telefono,
        u.correo,
        CASE 
          WHEN d.id IS NOT NULL THEN 'Doctor'
          WHEN p.id IS NOT NULL THEN 'Paciente'
          WHEN a.id IS NOT NULL THEN 'Administrador'
          ELSE 'Usuario'
        END AS tipo_usuario
      FROM 
        usuario u
      LEFT JOIN 
        doctor d ON u.id = d.id_usuario
      LEFT JOIN 
        paciente p ON u.id = p.id_usuario
      LEFT JOIN 
        administrador a ON u.id = a.id_usuario
      WHERE 
        u.correo = ? AND u.contrasena = ?`;

    connection.query(query, [correo, contrasena], (err, results) => {
        if (err) {
            console.error('Error en la consulta:', err);
            return res.status(500).send({ message: 'Error interno del servidor' });
        }

        if (results.length > 0) {
            return res.status(200).send(results[0]);
        } else {
            return res.status(401).send({ message: 'Credenciales incorrectas' });
        }
    });
});

app.post('/registrar_alergia_paciente', (req, res) => {
    const { id_paciente, id_alergia } = req.body;
    console.log("Peticion: ", req.body);
    const query = `INSERT INTO paciente_alergia (id_paciente, id_alergia) VALUES (?, ?)`;
    connection.query(query, [id_paciente, id_alergia], (err, results) => {
        if (err) {
            console.log(id_paciente, id_alergia);
            return res.status(500).send(err);
        } else {
            console.log("alergia registrada");
            return res.status(201).send({ message: 'Alergia registrada exitosamente.' });
        }
    });
});

app.post('/cita', (req, res) => {
    const { id_doctor, id_paciente, fecha, hora, estado } = req.body;
    const query = `INSERT INTO cita (id_doctor, id_paciente, fecha, hora, estado) VALUES (?, ?, ?, ?, ?)`;
    connection.query(query, [id_doctor, id_paciente, fecha, hora, estado], (err, results) => {
        if (err) {
            console.log(id_doctor, id_paciente, fecha, hora, estado);
            return res.status(500).send(err);
        } else {
            console.log("cita registrada");
            return res.status(201).send({ message: 'Cita registrada exitosamente.' });
        }
    });
});

// Iniciar el servidor
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});