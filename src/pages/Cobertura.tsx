import React, { useEffect, useState, useRef } from 'react';
import { IonContent, IonHeader, IonPage, IonTitle, IonToolbar, IonButton, IonList, useIonViewDidEnter, IonLabel, IonItem, IonAccordion, IonAccordionGroup, IonSearchbar, IonModal, IonButtons, IonSelect, IonSelectOption, IonInput } from '@ionic/react';
import { useHistory } from 'react-router-dom';
import axios from "axios";
import loadSQL from '../models/database';
import './ProgressBar.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'bootstrap/dist/js/bootstrap.bundle.min';
import { isPlatform } from '@ionic/react';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { Html5Qrcode } from "html5-qrcode";
import TomSelect from "tom-select";
import "tom-select/dist/css/tom-select.css";
import Swal from "sweetalert2";
import Select from 'react-select'; 

interface Evento {
  id_evento: number;
  estado_evento: string | null;
  nombre_evento: string | null;
  descripcion: string | null;
  lugar_evento: string | null;
  fecha_inicio_evento: string | null;
  hora_inicio_evento: string | null;
  fecha_fin_evento: string | null;
  hora_fin_evento: string | null;
  cupos_totales: number | null;
}

interface EventoAsistente {
  id_evento: number;
  id_usuario: number;
  estado_caracterizacion: number;
  fecharegistro: string | null;  // Fecha del registro, puede ser nula
  usuario: string | null;        // Nombre o ID del usuario, puede ser nulo
  estado: number | null;         // Estado del registro, puede ser nulo
  tabla: string | null;          // Nombre de la tabla, puede ser nulo
}


interface Actividad {
  id: number;
  id_evento: number;
  nombre_curso: string | null;
  lugar: string | null;
  descripcion: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  hora_inicio: string | null;
  hora_fin: string | null;
  cupos: string | null;
}

interface AccesoEvento {
  id_evento: number;
  id_curso: number;
  id_usuario: number;
  usuario: string;
  tabla: string | null;
  fecharegistro: string | null;
  estado: number | null;
}

interface AsistenteEvento {
  id_evento: number;
  id_usuario: number;
  id_actividad: number;
  ingreso: string | null;
  fecharegistro: string;
  usuario: number | null;
  token: string | null;
  estado: number | null;
  tabla: string | null;
}



async function getFromIndexedDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('myDatabase', 1);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('sqliteStore')) {
        db.createObjectStore('sqliteStore');
      }
    };

    request.onsuccess = (event) => {
      const db = event.target.result;

      if (!db.objectStoreNames.contains('sqliteStore')) {
        resolve(null);
        return;
      }

      const transaction = db.transaction(['sqliteStore'], 'readonly');
      const store = transaction.objectStore('sqliteStore');
      const getRequest = store.get('sqliteDb');

      getRequest.onsuccess = (event) => {
        const data = event.target.result;
        if (data) {
          resolve(data);
        } else {
          resolve(null);
        }
      };

      getRequest.onerror = (event) => {
        reject(event.target.error);
      };
    };

    request.onerror = (event) => {
      reject(event.target.error);
    };
  });
}


const Cobertura: React.FC = () => {

  const [db, setDb] = useState<any>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [accesosEvento, setAccesosEvento] = useState<AccesoEvento[]>([]);
  const [asistentesEvento, setAsistentesEvento] = useState<AsistenteEvento[]>([]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showCursoModal, setShowCursoModal] = useState(false);
  const [selectedCurso, setSelectedCurso] = useState<string>("");
  const [asistencias, setAsistencias] = useState<any[]>([]);
  const [decodedData, setDecodedData] = useState<any>(null);
  const [scanner, setScanner] = useState<any>(null);
  const [cursosInscritos, setCursosInscritos] = useState<Actividad[]>([]);
  const [totalAsistentesEstado2, setTotalAsistentesEstado2] =useState<EventoAsistente[]>([]);
// flujo “por cédula”
//const [showDocModal, setShowDocModal] = useState(false);
const [docInput, setDocInput] = useState('');
const [showFlowModal, setShowFlowModal] = useState(false);
//const [showEventModal, setShowEventModal] = useState(false);
const [eventosUsuario, setEventosUsuario] = useState<Evento[]>([]);
const [selectedEvent, setSelectedEvent] = useState<number | null>(null);
const [manualUserId, setManualUserId] = useState<number | null>(null);
  const [sincro, setSincro] = useState<any>(false);
  const [porcentaje, setPorcentaje] = useState<any>(1);
  const [showModal, setShowModal] = useState(false);
  const [dbContent, setDbContent] = useState<Uint8Array | null>(null);


  // 1) Deja el state igual
        const ROLE_PROJECT: Record<number, string> = {
          123: '1,2,3,4,5,6,7,8,9,10,11,12', // 👈 este rol ve proyecto 1 y 2
          6: '11',
          9: '11',
          8: '11',
          11: '11',
          27: '11',
        };

  const [allowedProject, setAllowedProject] = useState<string | null>(null);

  useEffect(() => {
    const fetchDatabaseContent = async () => {
      const savedDb = await getFromIndexedDB();
      if (savedDb) {
        setDbContent(new Uint8Array(savedDb));
      } else {
        console.error('No database found in IndexedDB');
      }
    };

    fetchDatabaseContent();
  }, []);

    useEffect(() => {
      if (!docInput.trim()) {
        setManualUserId(null);
        setEventosUsuario([]);
        setSelectedEvent(null);
        setSelectedCurso('');
        setDecodedData(null);
      }
    }, [docInput]);



  const getCurrentDateTime = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}${month}${day}_${hours}${minutes}${seconds}`;
  };

  const downloadFile = async () => {
    if (!dbContent) {
      console.error('No database content to download');
      return;
    }

    const fileName = `${localStorage.getItem('cedula')}_${getCurrentDateTime()}.sqlite`;
    const blob = new Blob([dbContent], { type: 'application/octet-stream' });

    if (isPlatform('hybrid')) {
      try {
        const base64Data = await convertBlobToBase64(blob);
        await Filesystem.writeFile({
          path: fileName,
          data: base64Data as string,
          directory: Directory.Documents,
        });

        alert('Archivo descargado exitosamente, busque el archivo en almacenamiento Documents');
      } catch (error) {
        console.error('Error al guardar el archivo:', error);
        alert('Error al guardar el archivo');
      }
    } else {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const convertBlobToBase64 = (blob: Blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        resolve(reader.result);
      };
      reader.readAsDataURL(blob);
    });
  };


  // hook for sqlite db

    //  let scanner: any = null;

useEffect(() => {
  if (showQRModal) {
    const timeout = setTimeout(() => {
      const readerElement = document.getElementById("reader");
      if (!readerElement) {
        console.warn("❌ No se encontró el div#reader");
        return;
      }

      const qrcode = new Html5Qrcode("reader");
      setScanner(qrcode);

      qrcode
        .start(
          { facingMode: "environment" },
          { fps: 10, qrbox: 320 },
          async (decodedText) => {
            await qrcode.stop();
            setShowQRModal(false);

            try {
              const urlParams = new URLSearchParams(decodedText.split("?")[1]);
              const id_usuario = urlParams.get("idusuario");
              const id_evento = urlParams.get("idevento");
              const token = urlParams.get("token");

              if (!id_usuario || !id_evento || !token) {
                alert("QR inválido");
                return;
              }

              setDecodedData({ id_usuario, id_evento, token, source: 'qr' });
              setShowCursoModal(true);
            } catch (error) {
              alert("❌ QR inválido o mal formado");
            }
          },
          () => {}
        )
        .catch((err) => {
          console.error("❌ Error al iniciar escáner:", err);
        });
    }, 500); // espera medio segundo para que el modal renderice

    return () => {
      clearTimeout(timeout);
    };
  }
}, [showQRModal]);


// Buscar usuario por cédula en la DB local e hidratar lista de eventos a los que está inscrito
// const onSubmitDocumento = async (e?: React.FormEvent) => {
//   e?.preventDefault();
//   const doc = (docInput || '').trim();
//   if (!doc) { alert('Digita la cédula'); return; }
//   if (!db) { alert('BD no cargada'); return; }

//   // 1) Usuario
//   const safeDoc = doc.replace(/'/g, "''");
//   const resU = await db.exec(`
//     SELECT id_usuario, numerodedocumento, nombre1, nombre2, apellido1, apellido2
//     FROM inclusion_ciudadano
//     WHERE numerodedocumento='${safeDoc}'
//     LIMIT 1;
//   `);

//   const rowU = resU?.[0]?.values?.[0];
//   if (!rowU) { alert('Usuario no encontrado'); return; }

//   // mapea por nombre de columna
//   const colsU = resU[0].columns;
//   const userObj: any = {};
//   colsU.forEach((c: string, i: number) => userObj[c] = rowU[i]);
//   const uid = Number(userObj.id_usuario);
//   setManualUserId(uid);

//   // 2) Eventos en los que el usuario está inscrito (t1_accesos_eventos)
//   const resE = await db.exec(`
//     SELECT DISTINCT e.id_evento, e.nombre_evento, e.descripcion, e.lugar_evento,
//            e.fecha_inicio_evento, e.hora_inicio_evento, e.fecha_fin_evento, e.hora_fin_evento, e.cupos_totales, e.estado_evento
//     FROM t1_eventos e
//     INNER JOIN t1_accesos_eventos a ON a.id_evento = e.id_evento
//     WHERE a.id_usuario = ${uid}
//     ORDER BY e.fecha_inicio_evento DESC;
//   `);

//   const eventosList: Evento[] = (resE?.[0]?.values || []).map((row: any[]) => {
//     const o: any = {};
//     resE[0].columns.forEach((c: string, i: number) => o[c] = row[i]);
//     return o as Evento;
//   });

//   setEventosUsuario(eventosList);
//   setShowDocModal(false);
//   setShowEventModal(true);
//   setSelectedEvent(null);
// };


const onSubmitDocumento = async (e?: React.FormEvent) => {
  e?.preventDefault();
  const doc = (docInput || '').trim();
  //if (!doc) { alert('Digita la cédula'); return; }
  //if (!db) { alert('BD no cargada'); return; }

  const safeDoc = doc.replace(/'/g, "''");

  // 1) Usuario
  const resU = await db.exec(`
    SELECT id_usuario, numerodedocumento, nombre1, nombre2, apellido1, apellido2
    FROM inclusion_ciudadano
    WHERE numerodedocumento='${safeDoc}'
    LIMIT 1;
  `);

  const rowU = resU?.[0]?.values?.[0];
  if (!rowU) { alert('Usuario no encontrado'); return; }

  const colsU = resU[0].columns;
  const userObj: any = {};
  colsU.forEach((c: string, i: number) => userObj[c] = rowU[i]);
  const uid = Number(userObj.id_usuario);
  setManualUserId(uid);

  // 2) Eventos inscritos
  const resE = await db.exec(`
    SELECT DISTINCT e.id_evento, e.nombre_evento, e.descripcion, e.lugar_evento,
           e.fecha_inicio_evento, e.hora_inicio_evento, e.fecha_fin_evento, e.hora_fin_evento, e.cupos_totales, e.estado_evento
    FROM t1_eventos e
    INNER JOIN t1_accesos_eventos a ON a.id_evento = e.id_evento
    WHERE a.id_usuario = ${uid}
    ORDER BY e.fecha_inicio_evento DESC;
  `);

  const eventosList: Evento[] = (resE?.[0]?.values || []).map((row: any[]) => {
    const o: any = {};
    resE[0].columns.forEach((c: string, i: number) => o[c] = row[i]);
    return o as Evento;
  });

  setEventosUsuario(eventosList);

  // NO cerrar modal, el siguiente select se habilita solo
};


const onSelectEvento = (eventId: number) => {
  setSelectedEvent(eventId);
  if (manualUserId) {
    setDecodedData({
      id_usuario: manualUserId,
      id_evento: eventId,
      token: null,
      source: 'cedula',
    });
  }
  setSelectedCurso(''); // limpiar actividad
};


// Confirmar evento y abrir el modal de actividades reutilizando tu flujo actual
const onSubmitEventoSeleccionado = () => {
  if (!manualUserId) { alert('Usuario no válido'); return; }
  if (!selectedEvent) { alert('Selecciona un evento'); return; }

  // Reutilizamos tu modal de actividades: armamos decodedData "manual"
  setDecodedData({ id_usuario: manualUserId, id_evento: selectedEvent, token: null, source: 'cedula' });
  setShowEventModal(false);
  setShowCursoModal(true);
};




const registrarAsistencia = async () => {
  if (cursosFiltrados.length > 0 && !selectedCurso) {
    alert("Seleccione una actividad.");
    return;
  }

  const hoy =localDate();
  const now = localDateTime();
  const usuarioSistema = localStorage.getItem('cedula') || "sistema";
  const ingresoTipo = decodedData?.source === 'cedula' ? 'cedula' : 'qr';

  const nuevoRegistro = {
    id_evento: parseInt(decodedData.id_evento),
    id_usuario: parseInt(decodedData.id_usuario),
    id_actividad: selectedCurso ? parseInt(selectedCurso) : 0,
    ingreso: ingresoTipo,
    fecharegistro: now,
    usuario: usuarioSistema,
    token: decodedData.token,
    estado: 1,
    tabla: "eventos_juventud_asistentes"
  };

  try {
    await  db.run(
      `
      INSERT OR REPLACE INTO t1_asistentes_evento 
      (id_evento, id_usuario, id_actividad, ingreso, fecharegistro, usuario, token, estado, tabla)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);
      `,
      [
        nuevoRegistro.id_evento,
        nuevoRegistro.id_usuario,
        nuevoRegistro.id_actividad,
        nuevoRegistro.ingreso,
        nuevoRegistro.fecharegistro,
        nuevoRegistro.usuario,
        nuevoRegistro.token,
        nuevoRegistro.estado,
        nuevoRegistro.tabla
      ]
    );

    // Refresca datos si lo deseas
    // await fetchAsistencias();

    setShowCursoModal(false);
    setSelectedCurso("");
    saveDatabase();
    alert("✅ Asistencia registrada correctamente");
     setShowFlowModal(false);   
    fetchAsistentesEvento();
    fetchEventos();
  } catch (error) {
    console.error("❌ Error al registrar asistencia:", error);
    alert("Ocurrió un error al registrar la asistencia.");
  }
};


    // const cursosFiltrados = decodedData
    //   ? actividades.filter((c) => c.id_evento === Number(decodedData.id_evento))
    //   : [];
    const cursosFiltrados = decodedData
  ? actividades.filter((c) => c.id_evento === Number(decodedData.id_evento))
  : [];


  useEffect(() => {
    const syncData = async () => {
       const project = await cargarProyectoPermitido(db);
      await loadSQL(setDb, fetchEventos);
      await fetchEventos(); 
      await  contarAsistentesEstado2();
      await fetchActividades();
      await fetchAccesosEvento();
      await fetchAsistentesEvento();
 
    };
    syncData();
  }, []);

  useEffect(() => {
    const syncData = async () => {
       const project = await cargarProyectoPermitido(db);
    await fetchEventos(); 
    await  contarAsistentesEstado2();
    await fetchActividades();
    await fetchAccesosEvento();
    await fetchAsistentesEvento();

 
    };
    syncData();
  }, [db]);



  const saveDatabase = () => {
    if (db) {
      const data = db.export();
      //localStorage.setItem('sqliteDb', JSON.stringify(Array.from(data)));
      const request = indexedDB.open('myDatabase', 1); // Asegúrate de usar el mismo nombre de base de datos

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('sqliteStore')) {
          db.createObjectStore('sqliteStore');
        }
      };

      request.onsuccess = (event) => {
        const db = event.target.result;
        const transaction = db.transaction(['sqliteStore'], 'readwrite');
        const store = transaction.objectStore('sqliteStore');
        const putRequest = store.put(data, 'sqliteDb');

        putRequest.onsuccess = () => {
        //  console.log('Data saved to IndexedDB');
        };

        putRequest.onerror = (event) => {
          console.error('Error saving data to IndexedDB:', event.target.error);
        };
      };

      request.onerror = (event) => {
        console.error('Failed to open IndexedDB:', event.target.error);
      };
    }
  };

//   const fetchEventos = async (database = db , project: string | null = allowedProject) => {
//   if (database) {
//     //const res = await database.exec('SELECT * FROM "t1_eventos";');
//     const where = project ? ` WHERE CAST(proyecto AS TEXT)='${project}'` : '';
//     const res = await database.exec(`SELECT * FROM "t1_eventos"${where};`);

//     if (res[0]?.values && res[0]?.columns) {
//       const transformedEventos: Evento[] = res[0].values.map((row: any[]) => {
//         return res[0].columns.reduce((obj, col, index) => {
//           obj[col] = row[index];
//           return obj;
//         }, {} as Evento);
//       });
//       setEventos(transformedEventos);
//     }
//   }
// };

// 2) Reemplaza SOLO tu fetchEventos por este (detecta comas y usa IN):
const fetchEventos = async (database = db, project: string | null = allowedProject) => {
  if (!database) return;

  // Si todavía no hay proyecto en state, lo cargamos aquí mismo
  if (!project) {
    project = await cargarProyectoPermitido(database);
  }

  let where = ' WHERE 1=0';
  if (project) {
    const list = project
      .split(',')
      .map(p => p.trim())
      .filter(Boolean)
      .map(p => `'${p.replace(/'/g, "''")}'`)
      .join(',');

    where = project.includes(',')
      ? ` WHERE CAST(proyecto AS TEXT) IN (${list})`
      : ` WHERE CAST(proyecto AS TEXT)='${project.trim().replace(/'/g, "''")}'`;
  }

  const res = await database.exec(`SELECT * FROM "t1_eventos"${where};`);
  if (res[0]?.values && res[0]?.columns) {
    const transformedEventos: Evento[] = res[0].values.map((row: any[]) =>
      res[0].columns.reduce((obj, col, index) => {
        (obj as any)[col] = row[index];
        return obj;
      }, {} as Evento)
    );
    setEventos(transformedEventos);
  } else {
    setEventos([]);
  }
};




const contarAsistentesEstado2 = async (database = db) => {
  if (database) {
      const res = await database.exec('SELECT * FROM "juventud_eventos_estado_evento" WHERE estado_caracterizacion = 2');
     if (res[0]?.values && res[0]?.columns) {
      const transformedAsistentes: EventoAsistente[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as EventoAsistente);
      });
      setTotalAsistentesEstado2(transformedAsistentes);
    }
  }
};



const fetchActividades = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_actividades";');
    if (res[0]?.values && res[0]?.columns) {
      const transformedActividades: Actividad[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as Actividad);
      });
      setActividades(transformedActividades);
    }
  }
};

const fetchAccesosEvento = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_accesos_eventos";');
    if (res[0]?.values && res[0]?.columns) {
      const transformedAccesos: AccesoEvento[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as AccesoEvento);
      });
      setAccesosEvento(transformedAccesos);
    }
  }
};


const fetchAsistentesEvento = async (database = db) => {
  if (database) {
    const res = await database.exec('SELECT * FROM "t1_asistentes_evento";');
    if (res[0]?.values && res[0]?.columns) {
      const transformed: AsistenteEvento[] = res[0].values.map((row: any[]) => {
        return res[0].columns.reduce((obj, col, index) => {
          obj[col] = row[index];
          return obj;
        }, {} as AsistenteEvento);
      });
      setAsistentesEvento(transformed);
    }
  }
};


  const sincronizacion = async () => {
  setSincro(true);
  setPorcentaje(2);
  closeModal();

  await saveDatabase();
  await fetchEventos(); 
  await fetchActividades();
  await  contarAsistentesEstado2();
  await fetchAccesosEvento();
  await fetchAsistentesEvento();

  
  // 🟩 GUARDAR ASISTENTES
  const guardarAsistentes = async () => {
    const response = await axios.post(
      'https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_guardar_asistentes_evento',
      asistentesEvento,
      { headers: { 'Content-Type': 'application/json' } }
    );
    setPorcentaje(10);
   // console.log('Asistentes enviados:', response.data);
  };

  if (!(await retryConDecision(guardarAsistentes, 'Error al guardar los asistentes'))) return setSincro(false);

  // 🟩 DESCARGAR USUARIOS
  const descargarUsuarios = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_login');
    for (const item of response.data) {
      await db.run(`INSERT OR REPLACE INTO t1_comision (id_usuario, cedula, contrasena, estado,rol) VALUES (?, ?, ?, ?,?);`, [
        item.ID_USUARIO, item.CEDULA, item.CONTRASENA, item.ESTADO,item.ROL
      ]);
    }
    saveDatabase();
    fetchEventos();
    setPorcentaje(20);
  };

  if (!(await retryConDecision(descargarUsuarios, 'Error al descargar usuarios'))) return setSincro(false);

  // 🟩 DESCARGAR EVENTOS
  const descargarEventos = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos');
    for (const item of response.data) {
      await db.run(`INSERT OR REPLACE INTO t1_eventos (
        id_evento, estado_evento, nombre_evento, descripcion, lugar_evento,
        fecha_inicio_evento, hora_inicio_evento, fecha_fin_evento, hora_fin_evento, cupos_totales, proyecto
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?,?);`, [
        item.id_evento,
        item.estado_evento,
        item.nombre_evento,
        item.descripcion,
        item.lugar_evento,
        item.fecha_inicio_evento,
        item.hora_inicio_evento,
        item.fecha_fin_evento,
        item.hora_fin_evento,
        item.cupos_totales,
        item.proyecto
      ]);
    }
    saveDatabase();
    fetchEventos();
    setPorcentaje(30);
  };

  if (!(await retryConDecision(descargarEventos, 'Error al descargar eventos'))) return setSincro(false);

  // 🟩 DESCARGAR ASISTENTES
  const descargarAsistentes = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_asistentes');
    for (const item of response.data) {
      await db.run(`INSERT OR REPLACE INTO t1_asistentes_evento (
        id_evento, id_usuario, id_actividad, ingreso, fecharegistro,
        usuario, token, estado, tabla
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
        item.id_evento,
        item.id_usuario,
        item.id_actividad,
        item.ingreso,
        item.fecharegistro,
        item.usuario,
        item.token,
        item.estado,
        item.tabla
      ]);
    }
    saveDatabase();

    const project = allowedProject ?? await cargarProyectoPermitido(db);
  await fetchEventos(db, project);
    fetchEventos();
    setPorcentaje(40);
  };

  if (!(await retryConDecision(descargarAsistentes, 'Error al descargar asistentes'))) return setSincro(false);

      // 🟩 DESCARGAR JUVENTUD EVENTOS ESTADO EVENTO
    const descargarJuventudEventosEstadoEvento = async () => {
      const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_general_asistentes');
      for (const item of response.data) {
        await db.run(`
          INSERT OR REPLACE INTO juventud_eventos_estado_evento (
            id_evento, id_usuario, estado_caracterizacion, fecharegistro,
            usuario, estado, tabla
          ) VALUES (?, ?, ?, ?, ?, ?, ?);`, [
          item.id_evento,
          item.id_usuario,
          item.estado_caracterizacion,
          item.fecharegistro,
          item.usuario,
          item.estado,
          item.tabla
        ]);
      }
      saveDatabase();
      fetchEventos(); // Puedes modificar esto según necesites, si deseas recargar datos o ejecutar alguna acción
      setPorcentaje(60);
    };

      if (!(await retryConDecision(descargarJuventudEventosEstadoEvento, 'Error al descargar asistentes'))) return setSincro(false);

      // 🟩 DESCARGAR ACCESOS A EVENTOS (inscripciones a actividades)
        const descargarAccesosEvento = async () => {
          const response = await axios.get(
            'https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_accesos'
          );

          const jsonData = response.data; 
          await db.run('DELETE FROM t1_accesos_eventos;');
          // console.log('Datos JSON recibidos (accesos):', jsonData);

          for (const item of jsonData) {
           
            await db.run(
              `
              INSERT OR REPLACE INTO t1_accesos_eventos (
                id_evento, id_curso, id_usuario, usuario, tabla, fecharegistro, estado
              ) VALUES (?, ?, ?, ?, ?, ?, ?);
              `,
              [
                item.id_evento,
                item.id_curso,
                item.id_usuario,
                item.usuario,
                item.tabla,
                item.fecharegistro,
                item.estado
              ]
            );
          }

          saveDatabase();
          await fetchAccesosEvento(); // refresca la lista en memoria
          setPorcentaje(50);          // ajusta el avance donde te convenga
        };

        // Llamada con reintento (ubicar en el flujo principal)
        if (!(await retryConDecision(descargarAccesosEvento, 'Error al descargar accesos'))) return setSincro(false);



      // 🟩 DESCARGAR INCLUSION CIUDADANO
      const descargarInclusionCiudadano = async () => {
        try {
          const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_inclusion_ciudadano');
          const jsonData = response.data;

          // Dividir los datos en bloques de 100
          const chunkSize = 100;
          for (let i = 0; i < jsonData.length; i += chunkSize) {
            const chunk = jsonData.slice(i, i + chunkSize);

            for (const item of chunk) {
              await db.run(`
                INSERT OR REPLACE INTO inclusion_ciudadano (
                  id_usuario, 
                  yearpostulacion, 
                  numerodedocumento, 
                  nombre1, 
                  nombre2, 
                  apellido1, 
                  apellido2, 
                  fecharegistro, 
                  usuario, 
                  estado, 
                  fecha_creacion
                ) VALUES (
                  ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
                );
              `, [
                item.id_usuario, 
                item.yearpostulacion, 
                item.numerodedocumento, 
                item.nombre1, 
                item.nombre2, 
                item.apellido1, 
                item.apellido2, 
                item.fecharegistro, 
                item.usuario, 
                item.estado, 
                item.fecha_creacion
              ]);

            }

            // Actualiza el progreso según el número de bloques procesados
            setPorcentaje((i + chunkSize) / jsonData.length * 100);
          }

          saveDatabase();
          fetchEventos(); // Similarmente, puedes cargar los datos si es necesario
          setPorcentaje(100); // Se asegura que el porcentaje llega al 100% al finalizar
        } catch (err) {
          console.error('Error al descargar los datos de inclusion_ciudadano:', err);
        }
      };


      if (!(await retryConDecision(descargarInclusionCiudadano, 'Error al descargar asistentes'))) return setSincro(false);


  // 🟩 DESCARGAR ACTIVIDADES
  const descargarActividades = async () => {
    const response = await axios.get('https://secretariadeinclusionsocial.co/appinclusionsocial/index.php/juventud/api_sincro_app/fc_juventud_eventos_actividades');
    for (const item of response.data) {
      await db.run(`INSERT OR REPLACE INTO t1_actividades (
        id, id_evento, nombre_curso, lugar, descripcion, fecha_inicio,
        fecha_fin, hora_inicio, hora_fin, cupos
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`, [
        item.id,
        item.id_evento,
        item.nombre_curso,
        item.lugar,
        item.descripcion,
        item.fecha_inicio,
        item.fecha_fin,
        item.hora_inicio,
        item.hora_fin,
        item.cupos
      ]);
    }
    saveDatabase();
    fetchEventos();
    contarAsistentesEstado2();
    fetchActividades();
    fetchAccesosEvento();
    fetchAsistentesEvento();
    setPorcentaje(100);
    await openModal('Sincronización efectiva', 'success', 'light', 'none');
  };

  if (!(await retryConDecision(descargarActividades, 'Error al descargar actividades'))) return setSincro(false);

  setSincro(false);
};




  const history = useHistory();
  const cedula = localStorage.getItem('cedula'); // Obtener 'cedula' de localStorage

  useEffect(() => {
    // Comprobar si 'cedula' existe, si no, redirigir a 'login'
    if (!cedula) {
      history.push('/login');
    }
  }, [cedula, history]); // Dependencias del efecto



  const accordionGroup = useRef<null | HTMLIonAccordionGroupElement>(null);
  const toggleAccordion = () => {
    if (!accordionGroup.current) {
      return;
    }
    const nativeEl = accordionGroup.current;

    if (nativeEl.value === 'second') {
      nativeEl.value = undefined;
    } else {
      nativeEl.value = 'second';
    }
  };

  const handleEditClick = (idfiu: string) => {
    window.location.href = `/tabs/tab3/${idfiu}`;
  };

  const [searchText, setSearchText] = useState('');


// const filteredEventos = eventos.filter((evento) => {
//   const texto = searchText.toLowerCase();
//   return (
//     (evento.nombre_evento || '').toLowerCase().includes(texto) ||
//     (evento.descripcion || '').toLowerCase().includes(texto) ||
//     (evento.lugar_evento || '').toLowerCase().includes(texto)
//   );
// });

const norm = (s: any) =>
  String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');


const filteredEventos = eventos.filter((evento) => {
  const q = norm(searchText);
  if (!q) return true;

  const matchEvento = [evento.nombre_evento, evento.descripcion, evento.lugar_evento]
    .some((v) => norm(v).includes(q));

  const matchActividad = actividades.some(
    (act) =>
      act.id_evento === evento.id_evento &&
      [act.nombre_curso, act.descripcion, act.lugar]
        .some((v) => norm(v).includes(q))
  );

  return matchEvento || matchActividad;
});



  const [modalResolve, setModalResolve] = useState<((value: boolean) => void) | null>(null);
  const [texto, setTextoModal] = useState<null | (() => void)>(null);
  const [color, setColorModal] = useState<null | (() => void)>(null);
  const [mensaje, setMensaje] = useState<null | (() => void)>(null);
  const [displaymodal, setDisplaymodal] = useState<null | (() => void)>(null);

const openModal = (mensaje, color, texto, displaymodal = '') => {
  setTextoModal(texto);
  setColorModal(color);
  setMensaje(mensaje);
  setDisplaymodal(displaymodal);

  return new Promise<boolean>((resolve) => {
    setModalResolve(() => resolve); // 🔁 Esto guarda la función resolve
    setShowModal(true);
  });
};




  const retryConDecision = async (fn: () => Promise<void>, mensajeError: string) => {
  let intentos = 0;
  while (intentos < 3) {
    try {
      await fn();
      return true;
    } catch (error) {
      console.error(`Error en intento ${intentos + 1}`, error);
      const decision = await mostrarModalReintento(`${mensajeError}. ¿Deseas reintentar o cancelar?`);
      if (!decision) return false; // Cancelar
    }
    intentos++;
  }
  return false;
};



const mostrarModalReintento = async (mensaje: string): Promise<boolean> => {
  return new Promise((resolve) => {
    setTextoModal(() => () => <>{mensaje}</>);
    setColorModal('danger');
    setMensaje(mensaje);
    setDisplaymodal('block');

    // Guarda la función `resolve` en el estado para usarla desde los botones
    setModalResolve(() => resolve); // 👈 CORRECTO: se pasa directamente `resolve`

    setShowModal(true);
  });
};



 const uniqueAsistentes = asistentesEvento.filter((value, index, self) => 
    index === self.findIndex((t) => (
      t.id_usuario === value.id_usuario && 
      t.id_evento === value.id_evento && 
      t.id_actividad === value.id_actividad
    ))
  );

const closeModal = () => {
  setShowModal(false);
  if (modalResolve) {
    modalResolve(); // Esto cierra el modal y continúa la ejecución
  }
};


const contarAsistentesEstado2PorEvento = (eventoId: number, totalAsistentesEstado2variable: any[]) => {

   console.log(totalAsistentesEstado2, 'asistentes');
  // Filtra los asistentes que pertenecen a ese evento y tienen el estado 2
  const asistentesEstado2 = totalAsistentesEstado2.filter(
    (asistente) => asistente.id_evento === eventoId && asistente.estado_caracterizacion === 2
  );

  console.log(totalAsistentesEstado2, 'asistentes');
  return asistentesEstado2.length;  // Devuelve el total de asistentes con estado 2 para ese evento
};


// Helper: "YYYY-MM-DD HH:mm:ss" en hora local del dispositivo
const localDateTime = () => {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;           // minutos → ms
  return new Date(d.getTime() - tz)                   // corrige a local
    .toISOString()
    .slice(0, 19)                                     // YYYY-MM-DDTHH:mm:ss
    .replace('T', ' ');
};

const localDate = () => localDateTime().slice(0, 10); // YYYY-MM-DD

          // ponlo junto a tus otros useEffect
          // useEffect(() => {
          //   if (showDocModal) setDocInput('');   // ← cada vez que abras el modal, pone "0"
          // }, [showDocModal]);

          const cargarProyectoPermitido = async (database = db) => {
            if (!database) return null;
            const ced = localStorage.getItem('cedula') || '';
            if (!ced) { setAllowedProject(null); return null; }

            const safeCed = ced.replace(/'/g, "''");
            const res = await database.exec(`
              SELECT rol
              FROM t1_comision
              WHERE cedula='${safeCed}'
              LIMIT 1;
            `);

            const rol = Number(res?.[0]?.values?.[0]?.[0]);
            const project = ROLE_PROJECT[rol] ?? null;
            setAllowedProject(project);
            return project;
          };


          // Busca por cédula al salir del input
              const buscarUsuarioPorCedula = async (docRaw?: string) => {
                const doc = (docRaw ?? '').trim();

                // Si no hay doc → limpiar y deshabilitar
                if (!doc) {
                  setManualUserId(null);
                  setEventosUsuario([]);
                  setSelectedEvent(null);
                  setSelectedCurso('');
                  setDecodedData(null);
                  return;
                }
                if (!db) { alert('BD no cargada'); return; }

                const safeDoc = doc.replace(/'/g, "''");

                // 1) Usuario
                const resU = await db.exec(`
                  SELECT id_usuario, numerodedocumento, nombre1, nombre2, apellido1, apellido2
                  FROM inclusion_ciudadano
                  WHERE numerodedocumento='${safeDoc}'
                  LIMIT 1;
                `);

                const rowU = resU?.[0]?.values?.[0];

                if (!rowU) {
                  // No encontrado → limpiar y deshabilitar todo
                  setManualUserId(null);
                  setEventosUsuario([]);
                  setSelectedEvent(null);
                  setSelectedCurso('');
                  setDecodedData(null);
                  alert('Usuario no encontrado');
                  return;
                }

                // Usuario OK
                const colsU = resU[0].columns;
                const userObj: any = {};
                colsU.forEach((c: string, i: number) => (userObj[c] = rowU[i]));
                const uid = Number(userObj.id_usuario);
                setManualUserId(uid);

                // 2) Eventos del usuario
                // const resE = await db.exec(`
                //   SELECT DISTINCT e.id_evento, e.nombre_evento, e.descripcion, e.lugar_evento,
                //         e.fecha_inicio_evento, e.hora_inicio_evento, e.fecha_fin_evento, e.hora_fin_evento, e.cupos_totales, e.estado_evento
                //   FROM t1_eventos e
                //   INNER JOIN t1_accesos_eventos a ON a.id_evento = e.id_evento
                //   WHERE a.id_usuario = ${uid}
                //   ORDER BY e.fecha_inicio_evento DESC;
                // `);
                const resE = await db.exec(`
                    SELECT DISTINCT 
                          e.id_evento, e.nombre_evento, e.descripcion, e.lugar_evento,
                          e.fecha_inicio_evento, e.hora_inicio_evento, 
                          e.fecha_fin_evento, e.hora_fin_evento, 
                          e.cupos_totales, e.estado_evento
                    FROM juventud_eventos_estado_evento jee
                    INNER JOIN t1_eventos e ON e.id_evento = jee.id_evento
                    WHERE jee.id_usuario = ${uid}
                    -- Si quieres ver solo confirmados, descomenta:
                     AND jee.estado_caracterizacion = 2
                    ORDER BY e.fecha_inicio_evento DESC;
                  `);

                const eventosList: Evento[] = (resE?.[0]?.values || []).map((row: any[]) => {
                  const o: any = {};
                  resE[0].columns.forEach((c: string, i: number) => (o[c] = row[i]));
                  return o as Evento;
                });

                setEventosUsuario(eventosList);

                // Reset dependientes
                setSelectedEvent(null);
                setSelectedCurso('');
                setDecodedData(null);
              };

const tieneActividades = selectedEvent
  ? actividades.some(a => a.id_evento === selectedEvent)
  : false;
 
  return (

    <IonPage >
      {(sincro) ? <>
        <div className="container">
          <div className="progress-container">
            <label htmlFor="">Sincronizando</label>
            <div className="progress" role="progressbar" aria-label="Animated striped example" aria-valuenow="75" aria-valuemin="0" aria-valuemax="100">
              <div className="progress-bar progress-bar-striped progress-bar-animated" style={{ width: `${porcentaje}%` }}></div>
            </div>
          </div>
        </div>
        <div className={`modal fade ${showModal ? 'show d-block' : 'd-none'} `} id="staticBackdrop" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="staticBackdropLabel" aria-hidden="true">
        <div className="modal-dialog ">
          <div className={`modal-content bg-${color} text-light`}>
          
              <h1 className="modal-title fs-5" id="staticBackdropLabel"></h1>
            
            <div className="modal-body">
              {mensaje}
            </div>

              <div className="d-flex pt-2 pb-2 p-2 text-right justify-content-end">
                {displaymodal !== 'none' ? (
                  <>
                    <button
                type="button"
                className={`btn btn-${color}`}
                style={{ display: `${displaymodal}` }}
                onClick={() => {
                  setShowModal(false);
                  if (modalResolve) {
                    modalResolve(false); // ⛔ CANCELAR = FALSE
                    setModalResolve(null); // limpia
                  }
                }}
              >
                Cancelar
              </button>&nbsp;

              <button
                type="button"
                className="btn btn-light"
                onClick={() => {
                  setShowModal(false);
                  modalResolve?.(true); // 👉 Reintentar
                }}
              >
                Reintentar
              </button>
            </>
          ) : (
            <button
              type="button"
              className="btn btn-light"
              onClick={() => {
                setShowModal(false);
                modalResolve?.(); // 👉 Aceptar
              }}
            >
              Aceptar
            </button>
          )}
        </div>

            
          </div>
        </div>
      </div>
  
        </>


        : <>
          {cedula ? (

            <>
              <IonHeader >
                <IonToolbar>
                  <IonTitle slot="start">Eventos</IonTitle>
                  {/* <IonButton color="danger" slot="end" onClick={() => {
                    //localStorage.removeItem('cedula');
                    window.location.href = `/tabs/tab3/${Math.random().toString().substr(2, 5)}${cedula}`;
                  }}>Crear Ficha</IonButton> */}
                  <IonButton
                    slot="end"
                    style={{ '--background': '#0e7fe1', '--color': 'white' }}
                    onClick={() => {
                      setDocInput('');
                      setEventosUsuario([]);
                      setSelectedEvent(null);
                      setManualUserId(null);
                      setSelectedCurso('');
                      setDecodedData(null);
                      setShowFlowModal(true);
                    }}
                  >
                    Identificación
                  </IonButton>

                  <IonButton slot="end"  style={{
                      '--background': '#0e7fe1',
                      '--color': 'white' // color del texto
                    }}  onClick={() => setShowQRModal(true)}>
                    QR
                  </IonButton>
                  {/* <IonButton slot="end" color="light" onClick={downloadFile}>Descargar bd</IonButton>  */}
                  <IonButton slot="end" color='light' onClick={() => {
                    localStorage.removeItem('cedula');
                    history.push('/login'); // Redirigir a login después de borrar 'cedula'
                  }}>Cerrar Sesión</IonButton>
                </IonToolbar>
              </IonHeader>
              <IonContent fullscreen>

                <IonList>
                      <IonItem lines="none">
                        <div
                          className="ion-align-items-center"
                          style={{
                            width: '100%',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}
                        >
                          <IonLabel style={{ width: '70%' }}>Eventos</IonLabel>
                          <IonLabel style={{ width: '27%' }}>Registrados</IonLabel>
                          
                          
                        </div>
                      </IonItem>
                    </IonList>

                  {/* <IonList>
  {filteredEventos.map((evento, idx) => (
    <IonAccordionGroup key={idx}>
      <IonAccordion value={`evento-${evento.id_evento}`}>
        <IonItem slot="header" color="light">
          <div
            style={{
              width: '100%',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <IonLabel style={{ width: '70%' }}>{evento.nombre_evento}</IonLabel>
            <IonLabel style={{ width: '20%' }}>
              {contarAsistentesEstado2PorEvento(evento.id_evento, asistentesEvento)}
            </IonLabel>
          </div>
        </IonItem>

        <div className="ion-padding" slot="content">
          <IonList>
         
            {actividades.filter((act) => act.id_evento === evento.id_evento).length === 0 ? (
              <>
                <IonItem>
                  <IonLabel>Sin Actividades</IonLabel>
                </IonItem>

            
                <IonItem>
                  <IonLabel>
                    <h2>Asistentes: {asistentesEvento.filter((asistente) => asistente.id_evento === evento.id_evento && asistente.id_actividad === 0).length}</h2>
                  </IonLabel>
                </IonItem>
              </>
            ) : (
              // Si hay actividades, mostrar las actividades y sus inscritos
              actividades
                .filter((act) => act.id_evento === evento.id_evento)
                .sort((a, b) =>
                    (a.nombre_curso || '').localeCompare(
                      (b.nombre_curso || ''),
                      'es',
                      { sensitivity: 'base', numeric: true }
                    )
                  )
                .map((actividad, i) => (
                  <IonItem key={i}>
                    <IonLabel>
                      <h2>📚 {actividad.nombre_curso}</h2>
                      <p>📍 {actividad.lugar} — {actividad.fecha_inicio} {actividad.hora_inicio}</p>
                      <p>👥 Inscritos: {
                        accesosEvento.filter(
                          (a) => a.id_evento === evento.id_evento && a.id_curso === actividad.id
                        ).length
                      }</p>
                      <p>✅ Asistentes: {
                        uniqueAsistentes.filter(
                          (a) => a.id_evento === evento.id_evento && a.id_actividad === actividad.id
                        ).length
                      }</p>
                    </IonLabel>
                  </IonItem>
                ))
            )}
          </IonList>
        </div>
      </IonAccordion>
    </IonAccordionGroup>
  ))}
</IonList> */}


<IonList>
  {filteredEventos.map((evento, idx) => {
    const q = norm(searchText);

    const matchEvento = [evento.nombre_evento, evento.descripcion, evento.lugar_evento]
      .some((v) => norm(v).includes(q));

    const matchActividad = actividades.some(
      (act) =>
        act.id_evento === evento.id_evento &&
        [act.nombre_curso, act.descripcion, act.lugar].some((v) => norm(v).includes(q))
    );

    const shouldExpand = !!q && (matchEvento || matchActividad);

    const todasDelEvento = actividades.filter((a) => a.id_evento === evento.id_evento);

    const actividadesVisibles = todasDelEvento
      .filter(
        (a) =>
          !q ||
          [a.nombre_curso, a.descripcion, a.lugar].some((v) => norm(v).includes(q))
      )
      .sort((a, b) =>
        (a.nombre_curso || '').localeCompare((b.nombre_curso || ''), 'es', {
          sensitivity: 'base',
          numeric: true,
        })
      );

    return (
      <IonAccordionGroup key={idx} value={shouldExpand ? `evento-${evento.id_evento}` : undefined}>
        <IonAccordion value={`evento-${evento.id_evento}`}>
          <IonItem slot="header" color="light">
            <div style={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <IonLabel style={{ width: '70%' }}>{evento.nombre_evento}</IonLabel>
              <IonLabel style={{ width: '20%' }}>
                {contarAsistentesEstado2PorEvento(evento.id_evento, asistentesEvento)}
              </IonLabel>
            </div>
          </IonItem>

          <div className="ion-padding" slot="content">
            <IonList>
              {todasDelEvento.length === 0 ? (
                <>
                  <IonItem>
                    <IonLabel>Sin Actividades</IonLabel>
                  </IonItem>
                  <IonItem>
                    <IonLabel>
                      <h2>
                        Asistentes:{' '}
                        {
                          asistentesEvento.filter(
                            (a) => a.id_evento === evento.id_evento && a.id_actividad === 0
                          ).length
                        }
                      </h2>
                    </IonLabel>
                  </IonItem>
                </>
              ) : actividadesVisibles.length === 0 ? (
                <IonItem>
                  <IonLabel>Sin actividades coincidentes</IonLabel>
                </IonItem>
              ) : (
                actividadesVisibles.map((actividad, i) => (
                  <IonItem key={i}>
                    <IonLabel>
                      <h2>📚 {actividad.nombre_curso}</h2>
                      <p>
                        📍 {actividad.lugar} — {actividad.fecha_inicio} {actividad.hora_inicio}
                      </p>
                      <p>
                        👥 Inscritos:{' '}
                        {
                          accesosEvento.filter(
                            (a) => a.id_evento === evento.id_evento && a.id_curso === actividad.id
                          ).length
                        }
                      </p>
                      <p>
                        ✅ Asistentes:{' '}
                        {
                          uniqueAsistentes.filter(
                            (a) => a.id_evento === evento.id_evento && a.id_actividad === actividad.id
                          ).length
                        }
                      </p>
                    </IonLabel>
                  </IonItem>
                ))
              )}
            </IonList>
          </div>
        </IonAccordion>
      </IonAccordionGroup>
    );
  })}
</IonList>




               



              </IonContent>
              <IonSearchbar
                value={searchText}
                onIonInput={(e) => setSearchText(e.detail.value)}
                placeholder="Buscar por estado, ficha, nombre, etc."
              />
              <IonButton onClick={sincronizacion}  
               style={{
                  '--background': '#e1740eff',
                  '--color': 'white' // color del texto
                }}>Actualizar datos y/o enviar registro de asistentes</IonButton>


                  {/* Modal de escaneo QR */}
                  <IonModal isOpen={showQRModal} 
                     onDidDismiss={() => setShowQRModal(false)}
                  >
                  <IonHeader>
                    <IonToolbar>
                      <IonTitle>Escanear QR</IonTitle>
                      <IonButtons slot="end">
                        <IonButton onClick={async () => {
                      if (scanner) {
                        await scanner.stop();
                        setShowQRModal(false);
                      }
                    }}>Cancelar</IonButton>
                      </IonButtons>
                    </IonToolbar>
                  </IonHeader>
                  <IonContent>
                    <div id="reader" style={{ width: "100%", height: 430, marginTop: 20 }}></div>
                  </IonContent>
                </IonModal>

                    {/* Modal de selección de curso */}
                <IonModal isOpen={showCursoModal} onDidDismiss={() => setShowCursoModal(false)}>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle>Registrar Asistencia</IonTitle>
                    <IonButtons slot="end">
                      <IonButton onClick={() => setShowCursoModal(false)}>Cancelar</IonButton>
                    </IonButtons>
                  </IonToolbar>
                </IonHeader>

                <IonContent className="ion-padding">
                  {/* 🔹 Selector de actividad para registrar asistencia */}
                  <IonLabel>Actividad</IonLabel>
                  <IonLabel position="stacked"><b>Actividad</b></IonLabel>
                    {(() => {
                      const hayActividades = cursosFiltrados.length > 0;

                      return (
                        <IonSelect
                          interface="popover"
                          placeholder={hayActividades ? "Selecciona una actividad" : "No hay actividades"}
                          value={selectedCurso || undefined}
                          onIonChange={(e) => setSelectedCurso(String(e.detail.value ?? ""))}
                          disabled={!hayActividades}
                        >
                          {hayActividades ? (
                            cursosFiltrados.map((curso) => (
                              <IonSelectOption key={curso.id} value={String(curso.id)}>
                                {curso.nombre_curso}
                              </IonSelectOption>
                            ))
                          ) : (
                            <IonSelectOption value="" disabled>
                              No hay actividades
                            </IonSelectOption>
                          )}
                        </IonSelect>
                      );
                    })()}


                  <IonButton
                    expand="block"
                    className="ion-margin-top"
                    onClick={registrarAsistencia}
                  >
                    Registrar Asistencia
                  </IonButton>

                      <p></p>
                   {/* 🔹 Mostrar actividades ya inscritas */}
                  {decodedData ? (
                          <>
                            <IonLabel>Actividades en las que ya estás inscrito:</IonLabel>
                              <ul style={{ marginBottom: '1rem' }}>
                                {accesosEvento
                                  .filter(
                                    (a) =>
                                      a.id_usuario == decodedData.id_usuario &&
                                      a.id_evento == decodedData.id_evento
                                  )
                                  .map((a, idx) => {
                                    const curso = actividades.find(
                                      (c) => c.id === a.id_curso && c.id_evento === a.id_evento
                                    );

                                  //  console.log("🎯 Curso inscrito:", curso);

                                    return (
                                      <li key={idx}>
                                        ✅ {curso?.nombre_curso || `Curso ID ${a.id_curso}`}
                                      </li>
                                    );
                                  })}
                              </ul>
                          </>
                        ) : (
                          <IonLabel>Cargando información del QR...</IonLabel>
                        )}

                </IonContent>





              </IonModal>

              {/* Modal 1: Ingresar cédula */}

              <IonModal isOpen={showFlowModal} onDidDismiss={() => setShowFlowModal(false)}>
                <IonHeader>
                  <IonToolbar>
                    <IonTitle>Registro por cédula</IonTitle>
                    <IonButtons slot="end">
                      <IonButton onClick={() => setShowFlowModal(false)}>Cerrar</IonButton>
                    </IonButtons>
                  </IonToolbar>
                </IonHeader>

                <IonContent className="ion-padding">

                  {/* Paso 1: Cédula */}
                  {/* Paso 1: Cédula */}
                <div className="ion-margin-bottom">
                  <IonLabel position="stacked"><b>1) Cédula / Documento</b></IonLabel>
                    <IonInput
                      value={docInput}
                      onIonInput={(e) => setDocInput(String(e.detail.value ?? ''))}             // actualiza al teclear
                      onIonChange={(e) => buscarUsuarioPorCedula(String(e.detail.value ?? ''))} // busca al salir/commit
                      placeholder="Digite la cédula"
                      inputmode="numeric"
                      required
                    />
                </div>


                  {/* Paso 2: Evento (se habilita cuando hay manualUserId y eventosUsuario) */}
                  {/* Paso 2: Evento */}
                  <div className="ion-margin-bottom" style={{ opacity: manualUserId ? 1 : 0.5 }}>
                    <IonLabel position="stacked"><b>2) Evento</b></IonLabel>
                    <IonSelect
                      interface="popover"
                      placeholder={manualUserId ? "Seleccione evento" : "Primero ingrese la cédula"}
                      value={selectedEvent ?? undefined}
                      onIonChange={(e) => onSelectEvento(Number(e.detail.value))}
                      disabled={!manualUserId || eventosUsuario.length === 0}   // 👈 deshabilita
                    >
                      {eventosUsuario.length
                        ? eventosUsuario.map((ev) => (
                            <IonSelectOption key={ev.id_evento} value={ev.id_evento}>
                              {ev.nombre_evento}
                            </IonSelectOption>
                          ))
                        : <IonSelectOption value="" disabled>No hay eventos inscritos</IonSelectOption>
                      }
                    </IonSelect>
                  </div>

                  {/* Paso 3: Actividad */}
                  

                  {/* Paso 3: Actividad (se habilita cuando ya hay evento seleccionado) */}
                  <div className="ion-margin-bottom" style={{ opacity: selectedEvent ? 1 : 0.5 }}>
                    <IonLabel position="stacked"><b>3) Actividad</b></IonLabel>

                          {(() => {
                            const hayEvento = !!selectedEvent;
                            const hayActividades = cursosFiltrados.length > 0;

                            const placeholder = !hayEvento
                              ? "Primero seleccione un evento"
                              : (hayActividades ? "Selecciona una actividad" : "No hay actividades");

                            return (
                              <IonSelect
                                interface="popover"
                                placeholder={placeholder}
                                value={selectedCurso || undefined}
                                onIonChange={(e) => setSelectedCurso(String(e.detail.value ?? ""))}
                                disabled={!hayEvento || !hayActividades}
                              >
                                {hayActividades ? (
                                  cursosFiltrados.map((curso) => (
                                    <IonSelectOption key={curso.id} value={String(curso.id)}>
                                      {curso.nombre_curso}
                                    </IonSelectOption>
                                  ))
                                ) : (
                                  // Para que el popover muestre el mensaje claramente
                                  <IonSelectOption value="" disabled>
                                    No hay actividades
                                  </IonSelectOption>
                                )}
                              </IonSelect>
                            );
                          })()}

                    {/* Tip: mostrar actividades ya inscritas (como en tu modal anterior) */}
                    {decodedData && (
                      <>
                        <div className="ion-margin-top" />
                        <IonLabel>Actividades en las que ya estás inscrito:</IonLabel>
                        <ul style={{ marginBottom: '1rem' }}>
                          {accesosEvento
                            .filter(a => a.id_usuario == decodedData.id_usuario && a.id_evento == decodedData.id_evento)
                            .map((a, idx) => {
                              const curso = actividades.find(c => c.id === a.id_curso && c.id_evento === a.id_evento);
                              return (<li key={idx}>✅ {curso?.nombre_curso || `Curso ID ${a.id_curso}`}</li>);
                            })}
                        </ul>
                      </>
                    )}
                  </div>

                  {/* Acción final */}
                  <IonButton
                    expand="block"
                    className="ion-margin-top"
                    onClick={registrarAsistencia}
                    // disabled={!(decodedData && selectedCurso)}
                     disabled={!(decodedData && (selectedCurso || !tieneActividades))}
                  >
                    Registrar asistencia
                  </IonButton>

                </IonContent>
              </IonModal>






            </>
          ) : ''}

        </>}
    </IonPage>
    
  );
};

export default Cobertura;
