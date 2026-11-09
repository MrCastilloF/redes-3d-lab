/* =====================================================================================================
   DATOS — Contenido de la red, conservado sin cambios respecto a explorador-de-redes/3d.html.
   Fuente: https://mrcastillof.github.io/explorador-de-redes/3d.html
   · Edita nombres, IP, MAC, VLAN o posiciones (x, y) sin tocar la lógica.
   ===================================================================================================== */
const DATOS = {
  meta: {
    titulo: "Explorador de Redes",
    institucion: "labs_redes_test",
    escenarioPorDefecto: "op1"
  },

  /* ---- VLANs del escenario "Después" (esquema de direccionamiento propuesto) ---- */
  vlans: [
    { id:10,  nombre:"Administración", red:"10.10.10.0/24",   gw:"10.10.10.1",   dhcp:"10.10.10.100 – .199",    color:"#8b5cf6", uso:"Rectoría, contabilidad, oficinas" },
    { id:20,  nombre:"Docentes",       red:"10.10.20.0/24",   gw:"10.10.20.1",   dhcp:"10.10.20.100 – .199",    color:"#2563eb", uso:"PC de docentes y sala de profesores" },
    { id:30,  nombre:"Estudiantes",    red:"10.10.30.0/24",   gw:"10.10.30.1",   dhcp:"10.10.30.100 – .249",    color:"#0d9488", uso:"Aulas de cómputo y Wi-Fi de alumnos" },
    { id:40,  nombre:"Voz (VoIP)",     red:"10.10.40.0/24",   gw:"10.10.40.1",   dhcp:"10.10.40.50 – .99",      color:"#d97706", uso:"Teléfonos IP con prioridad QoS" },
    { id:50,  nombre:"CCTV",           red:"10.10.50.0/24",   gw:"10.10.50.1",   dhcp:"Estático (.10 – .50)",   color:"#dc2626", uso:"Cámaras y grabador NVR (PoE)" },
    { id:60,  nombre:"Servidores",     red:"10.10.60.0/24",   gw:"10.10.60.1",   dhcp:"Estático",               color:"#6366f1", uso:"DNS, DHCP y portal web interno" },
    { id:99,  nombre:"Gestión",        red:"10.10.99.0/24",   gw:"10.10.99.1",   dhcp:"Estático",               color:"#64748b", uso:"Firewall, conmutadores y puntos de acceso" },
    { id:100, nombre:"Invitados",      red:"10.10.100.0/24",  gw:"10.10.100.1",  dhcp:"10.10.100.50 – .200",    color:"#db2777", uso:"SSID de visitantes (aislado)" },
    { id:0,   nombre:"WAN (Internet)", red:"203.0.113.0/30",  gw:"203.0.113.1",  dhcp:"Enlace punto a punto",   color:"#94a3b8", uso:"Uplink dedicado con el ISP" }
  ],

  /* ---- Notas de direccionamiento del escenario "Después" ---- */
  notasDespues: [
    "El FortiGate 200G funciona como router-on-a-stick: la interfaz port2 crea una subinterfaz 802.1Q por VLAN (10.10.X.1) y hace de puerta de enlace para todas las subredes.",
    "Cada subred usa máscara /24 (255.255.255.0): 254 hosts útiles por VLAN, suficiente para el aforo del colegio.",
    "El DHCP está centralizado en el servidor 10.10.60.10; el firewall usa relay (IP helper) para recibir las broadcasts DHCP desde cualquier VLAN.",
    "Los conmutadores y AP se administran por la VLAN 99 (10.10.99.0/24), fuera de las subredes de usuarios.",
    "La VLAN 50 (CCTV) usa direcciones estáticas: las cámaras y el NVR nunca dependen del DHCP para volver a aparecer en el mapa de video.",
    "El enlace con el ISP usa la red documental 203.0.113.0/30: solo 2 direcciones útiles (ISP .1 y firewall .2).",
    "La VLAN 100 (invitados) está aislada: solo tiene salida a Internet, no alcanza las VLANes internas."
  ],

  /* =====================================================================================================
     NODOS Y ENLACES DEL ESCENARIO "DESPUÉS" (base compartida por las opciones 1, 2 y 3).
     Coordenadas x, y en el lienzo de 1660 × 920. Caja del nodo: 146 × 92.
     ===================================================================================================== */
  baseDespues: {
    nodos: [
      { id:"internet", tipo:"nube", nombre:"Internet", info:"Red pública · nube",
        x:800, y:60, vlans:[], estado:"Activo",
        protocolos:["ethernet","ipv4","tcp","udp","dns","http","https"],
        notas:"Tráfico de terceros: fuera del control del colegio. Todo lo que entra pasa por el perímetro." },

      { id:"isp", tipo:"router", nombre:"Router ISP", info:"203.0.113.1/30",
        x:800, y:175, ip:"203.0.113.1", mascara:"/30", mac:"00:1A:2B:AA:00:01", vlans:[0],
        estado:"Activo", fabricante:"Proveedor de Internet",
        interfaces:[{ nombre:"eth0 (enlace)", ip:"203.0.113.1/30", modo:"WAN" }],
        protocolos:["ethernet","ipv4","icmp","arp","stp"],
        notas:"Enlace dedicado de 1 Gbps en fibra. El colegio solo ve la interfaz del proveedor." },

      { id:"fg1", tipo:"firewall", nombre:"FortiGate 200G", info:"Perímetro · stand-alone",
        x:800, y:295, ip:"10.10.99.1", mascara:"/24", mac:"00:09:0F:AA:00:01",
        vlan:99, vlans:[10,20,30,40,50,60,99,100,0], estado:"Operativo",
        fabricante:"Fortinet", modelo:"FG-200G-BDL-950-12",
        interfaces:[
          { nombre:"wan1",       ip:"203.0.113.2/30",   modo:"WAN (salida a Internet)" },
          { nombre:"port2.10",   ip:"10.10.10.1/24",    modo:"Subinterfaz VLAN 10" },
          { nombre:"port2.20",   ip:"10.10.20.1/24",    modo:"Subinterfaz VLAN 20" },
          { nombre:"port2.30",   ip:"10.10.30.1/24",    modo:"Subinterfaz VLAN 30" },
          { nombre:"port2.40",   ip:"10.10.40.1/24",    modo:"Subinterfaz VLAN 40" },
          { nombre:"port2.50",   ip:"10.10.50.1/24",    modo:"Subinterfaz VLAN 50" },
          { nombre:"port2.60",   ip:"10.10.60.1/24",    modo:"Subinterfaz VLAN 60" },
          { nombre:"port2.99",   ip:"10.10.99.1/24",    modo:"Subinterfaz VLAN 99 (gestión)" },
          { nombre:"port2.100",  ip:"10.10.100.1/24",   modo:"Subinterfaz VLAN 100" }
        ],
        protocolos:["ethernet","vlan","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https","stp","fortilink","lldp","ssh"],
        notas:"NP7Lite + CP10 · FortiGuard UTP + FortiCare Premium (bundle 950, 12 meses). Enruta entre VLANes, aplica políticas y hace de relay DHCP." },

      { id:"sw-core", tipo:"switch", nombre:"FortiSwitch FS-148F-POE", info:"Núcleo · distribución",
        x:800, y:425, ip:"10.10.99.11", mascara:"/24", mac:"00:09:0F:11:99:11", vlan:99,
        vlans:[10,20,30,40,50,60,99,100], estado:"Operativo",
        fabricante:"Fortinet", modelo:"FS-148F-POE",
        interfaces:[{ nombre:"port1", ip:"Trunk 802.1Q", modo:"Trunk al FortiGate (FortiLink)" },
                    { nombre:"port24", ip:"10.10.99.11/24", modo:"Acceso VLAN 99" }],
        protocolos:["ethernet","vlan","arp","ipv4","stp","fortilink","lldp"],
        notas:"Gestionado por FortiLink desde el FortiGate: sus puertos aparecen como interfaces del firewall." },

      { id:"srv", tipo:"servidor", nombre:"Servidores", info:"DNS · DHCP · Web",
        x:1240, y:425, ip:"10.10.60.10", mascara:"/24", mac:"00:09:0F:60:00:10", vlan:60, vlans:[60],
        estado:"Operativo", fabricante:"Dell PowerEdge", modelo:"R450 (virtualizado)",
        interfaces:[{ nombre:"eth0", ip:"10.10.60.10/24", modo:"Acceso VLAN 60" }],
        dhcp:true,
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https","ssh"],
        notas:"Centraliza DNS (10.10.60.10), DHCP (relay desde todas las VLANes) y el portal web interno." },

      { id:"sw-admin", tipo:"switch", nombre:"FortiSwitch FS-148F-POE", info:"Administración",
        x:280, y:555, ip:"10.10.99.12", mascara:"/24", mac:"00:09:0F:11:99:12", vlan:99,
        vlans:[10,40,99], estado:"Operativo", fabricante:"Fortinet", modelo:"FS-148F-POE",
        interfaces:[{ nombre:"port1", ip:"Trunk 802.1Q", modo:"Trunk al núcleo" },
                    { nombre:"port8", ip:"10.10.40.21/24", modo:"Acceso VLAN 40 (PoE)" }],
        protocolos:["ethernet","vlan","arp","ipv4","stp","fortilink","lldp"],
        notas:"Da servicio a oficinas (VLAN 10) y a los teléfonos IP (VLAN 40 con PoE+)." },

      { id:"sw-aulas", tipo:"switch", nombre:"FortiSwitch FS-148F-POE", info:"Aulas y pabellón",
        x:800, y:555, ip:"10.10.99.13", mascara:"/24", mac:"00:09:0F:11:99:13", vlan:99,
        vlans:[20,30,99,100], estado:"Operativo", fabricante:"Fortinet", modelo:"FS-148F-POE",
        interfaces:[{ nombre:"port1", ip:"Trunk 802.1Q", modo:"Trunk al núcleo" },
                    { nombre:"port30", ip:"10.10.30.21/24", modo:"Acceso VLAN 30" }],
        protocolos:["ethernet","vlan","arp","ipv4","stp","fortilink","lldp"],
        notas:"Conecta las aulas cableadas (VLAN 20/30) y los puntos de acceso en tronco (30/99/100)." },

      { id:"sw-cctv", tipo:"switch", nombre:"FortiSwitch FS-124F-POE", info:"CCTV y PoE",
        x:1400, y:555, ip:"10.10.99.14", mascara:"/24", mac:"00:09:0F:11:99:14", vlan:99,
        vlans:[50,99], estado:"Operativo", fabricante:"Fortinet", modelo:"FS-124F-POE",
        interfaces:[{ nombre:"port1", ip:"Trunk 802.1Q", modo:"Trunk al núcleo" },
                    { nombre:"port4", ip:"10.10.50.20/24", modo:"Acceso VLAN 50 (PoE+)" }],
        protocolos:["ethernet","vlan","arp","ipv4","stp","fortilink","lldp"],
        notas:"Alimenta por PoE+ las cámaras y mantiene el tráfico de video confinado en la VLAN 50." },

      { id:"pc-admin", tipo:"pc", nombre:"PC · Administración", info:"10.10.10.21 · VLAN 10",
        x:160, y:695, ip:"10.10.10.21", mascara:"/24", mac:"00:1A:2B:10:00:21", vlan:10, vlans:[10],
        estado:"Activo", fabricante:"Lenovo", modelo:"ThinkCentre M70q",
        interfaces:[{ nombre:"eth0", ip:"10.10.10.21/24", modo:"Estático" }],
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https","ssh"],
        notas:"Equipo de contabilidad con acceso a facturación y al portal interno." },

      { id:"tel", tipo:"telefono", nombre:"Teléfonos IP", info:"×6 · 10.10.40.21",
        x:400, y:695, ip:"10.10.40.21", mascara:"/24", mac:"00:1A:2B:40:00:21", vlan:40, vlans:[40],
        estado:"Activo", fabricante:"Fortinet", modelo:"FAP-Phone (PoE)",
        interfaces:[{ nombre:"eth0", ip:"10.10.40.21/24", modo:"DHCP con reserva" }],
        protocolos:["ethernet","arp","ipv4","udp","dhcp","dns","rtp"],
        notas:"VLAN dedicada con prioridad QoS: la voz viaja por encima del tráfico de datos." },

      { id:"ap-aulas", tipo:"ap", nombre:"FortiAP 231K", info:"×15 · Wi-Fi 7",
        x:640, y:695, ip:"10.10.99.21", mascara:"/24", mac:"00:09:0F:21:99:21", vlan:99,
        vlans:[30,99,100], estado:"Operativo", fabricante:"Fortinet", modelo:"FAP-231K-A (Wi-Fi 7)",
        interfaces:[{ nombre:"eth0", ip:"10.10.99.21/24", modo:"Trunk 30/99/100 (PoE+)" }],
        protocolos:["ethernet","vlan","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https","stp","lldp"],
        notas:"Tri-banda 2.4 / 5 / 6 GHz. Los SSIDs reparten la VLAN 30 (alumnos) y la 100 (invitados)." },

      { id:"ap-legacy", tipo:"ap", nombre:"UAP-AC-LR", info:"×21 · conservados",
        x:792, y:695, ip:"10.10.99.22", mascara:"/24", mac:"00:09:0F:22:99:22", vlan:99,
        vlans:[30,99], estado:"Operativo", fabricante:"Ubiquiti", modelo:"UAP-AC-LR",
        interfaces:[{ nombre:"eth0", ip:"10.10.99.22/24", modo:"Trunk 30/99 (PoE)" }],
        protocolos:["ethernet","vlan","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https","stp","lldp"],
        notas:"21 unidades conservadas del parque anterior: siguen operativos en 2.4/5 GHz." },

      { id:"pc-docente", tipo:"pc", nombre:"PC · Docente", info:"10.10.20.21 · VLAN 20",
        x:944, y:695, ip:"10.10.20.21", mascara:"/24", mac:"00:1A:2B:20:00:21", vlan:20, vlans:[20],
        estado:"Activo", fabricante:"HP", modelo:"ProDesk 400",
        interfaces:[{ nombre:"eth0", ip:"10.10.20.21/24", modo:"DHCP" }],
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
        notas:"Planificación de clases y acceso al portal de notas." },

      { id:"aula-pcs", tipo:"pc", nombre:"Aula de cómputo", info:"×20 · 10.10.30.21",
        x:1170, y:695, ip:"10.10.30.21", mascara:"/24", mac:"00:1A:2B:30:00:21", vlan:30, vlans:[30],
        estado:"Activo", fabricante:"Ensamble", modelo:"20 equipos (VLAN 30)",
        interfaces:[{ nombre:"eth0", ip:"10.10.30.21/24", modo:"DHCP" }],
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
        notas:"Bloque de 20 equipos con salida a Internet filtrada por el perímetro." },

      { id:"camaras", tipo:"camara", nombre:"Cámaras CCTV", info:"×12 · 10.10.50.20",
        x:1340, y:695, ip:"10.10.50.20", mascara:"/24", mac:"00:1A:2B:50:00:20", vlan:50, vlans:[50],
        estado:"Operativo", fabricante:"Hikvision", modelo:"DS-2CD (PoE+)",
        interfaces:[{ nombre:"eth0", ip:"10.10.50.20/24", modo:"Estático" }],
        protocolos:["ethernet","arp","ipv4","tcp","udp","http","https"],
        notas:"12 cámaras alimentadas por PoE+ desde el FS-124F; flujo constante hacia el NVR." },

      { id:"nvr", tipo:"nvr", nombre:"NVR · Grabador", info:"10.10.50.10 · VLAN 50",
        x:1520, y:695, ip:"10.10.50.10", mascara:"/24", mac:"00:1A:2B:50:00:10", vlan:50, vlans:[50],
        estado:"Operativo", fabricante:"Hikvision", modelo:"DS-7616NI (16 canales)",
        interfaces:[{ nombre:"eth0", ip:"10.10.50.10/24", modo:"Estático" }],
        protocolos:["ethernet","arp","ipv4","tcp","udp","http","https"],
        notas:"Guarda 30 días de video; solo es accesible desde la VLAN 10 (administración)." },

      { id:"laptop", tipo:"portatil", nombre:"Portátil · Wi-Fi", info:"10.10.30.77 · SSID Alumnos",
        x:720, y:835, ip:"10.10.30.77", mascara:"/24", mac:"00:1A:2B:30:00:77", vlan:30, vlans:[30],
        estado:"Activo", fabricante:"BYOD", modelo:"Portátil de alumno",
        interfaces:[{ nombre:"wlan0", ip:"10.10.30.77/24", modo:"DHCP (SSID Alumnos)" }],
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
        notas:"Se conecta por Wi-Fi 6 al FortiAP y obtiene su IP por DHCP en la VLAN 30." }
    ],

    enlaces: [
      { id:"l-isp", a:"internet", b:"isp", tipo:"wan", rotulo:"Uplink · 1 Gbps",
        nombre:"Uplink a Internet", velocidad:"1 Gbps", medio:"Fibra dedicada (modo ruta)",
        vlans:[0], ip:"203.0.113.0/30", estado:"Activo",
        protocolos:["ethernet","ipv4","icmp","tcp","udp","dns","http","https"] },

      { id:"l-wan", a:"isp", b:"fg1", tipo:"wan", rotulo:"203.0.113.0/30",
        nombre:"Enlace WAN (puerto wan1)", velocidad:"1 Gbps", medio:"Fibra · SFP",
        vlans:[0], ip:"ISP .1 → FortiGate .2", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dns"] },

      { id:"l-fortilink", a:"fg1", b:"sw-core", tipo:"fortilink", rotulo:"FortiLink · 10 Gbps",
        nombre:"FortiLink (tronco 802.1Q)", velocidad:"10 Gbps", medio:"Fibra MMF · FN-TRAN-SX",
        vlans:[10,20,30,40,50,60,99,100], ip:"Trunk (sin IP de enlace)", estado:"Activo",
        protocolos:["ethernet","vlan","stp","fortilink","lldp","arp","ipv4"] },

      { id:"l-core-srv", a:"sw-core", b:"srv", tipo:"acceso", rotulo:"VLAN 60 · 1 Gbps",
        nombre:"Acceso a servidores", velocidad:"1 Gbps", medio:"Cobre Cat6",
        vlans:[60], ip:"10.10.60.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

      { id:"l-core-admin", a:"sw-core", b:"sw-admin", tipo:"trunk", rotulo:"Trunk · 10 Gbps",
        nombre:"Tronco a administración", velocidad:"10 Gbps", medio:"Fibra MMF",
        vlans:[10,40,99], ip:"Trunk", estado:"Activo",
        protocolos:["ethernet","vlan","stp","arp","ipv4","lldp"] },

      { id:"l-core-aulas", a:"sw-core", b:"sw-aulas", tipo:"trunk", rotulo:"Trunk · 10 Gbps",
        nombre:"Tronco a aulas", velocidad:"10 Gbps", medio:"Fibra MMF",
        vlans:[20,30,99,100], ip:"Trunk", estado:"Activo",
        protocolos:["ethernet","vlan","stp","arp","ipv4","lldp"] },

      { id:"l-core-cctv", a:"sw-core", b:"sw-cctv", tipo:"trunk", rotulo:"Trunk · 1 Gbps",
        nombre:"Tronco a CCTV", velocidad:"1 Gbps", medio:"Cobre Cat6",
        vlans:[50,99], ip:"Trunk", estado:"Activo",
        protocolos:["ethernet","vlan","stp","arp","ipv4","lldp"] },

      { id:"l-adm-pc", a:"sw-admin", b:"pc-admin", tipo:"acceso", rotulo:"VLAN 10 · 1 Gbps",
        nombre:"Acceso PC administración", velocidad:"1 Gbps", medio:"Cobre Cat6",
        vlans:[10], ip:"10.10.10.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

      { id:"l-adm-tel", a:"sw-admin", b:"tel", tipo:"poe", rotulo:"VLAN 40 · PoE+",
        nombre:"Alimentación teléfonos IP", velocidad:"1 Gbps", medio:"Cobre Cat6 · PoE+ 802.3at",
        vlans:[40], ip:"10.10.40.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","udp","dhcp","dns","rtp"] },

      { id:"l-aul-ap", a:"sw-aulas", b:"ap-aulas", tipo:"poe", rotulo:"Trunk 30/99 · PoE+",
        nombre:"FortiAP principal", velocidad:"1 Gbps", medio:"Cobre Cat6 · PoE+",
        vlans:[30,99,100], ip:"Trunk", estado:"Activo",
        protocolos:["ethernet","vlan","arp","ipv4","stp","lldp"] },

      { id:"l-aul-apl", a:"sw-aulas", b:"ap-legacy", tipo:"poe", rotulo:"Trunk 30/99 · PoE",
        nombre:"AP Ubiquiti conservados", velocidad:"1 Gbps", medio:"Cobre Cat6 · PoE",
        vlans:[30,99], ip:"Trunk", estado:"Activo",
        protocolos:["ethernet","vlan","arp","ipv4","stp","lldp"] },

      { id:"l-aul-doc", a:"sw-aulas", b:"pc-docente", tipo:"acceso", rotulo:"VLAN 20 · 1 Gbps",
        nombre:"Acceso PC docente", velocidad:"1 Gbps", medio:"Cobre Cat6",
        vlans:[20], ip:"10.10.20.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

      { id:"l-aul-pcs", a:"sw-aulas", b:"aula-pcs", tipo:"acceso", rotulo:"VLAN 30 · 1 Gbps",
        nombre:"Aula de cómputo", velocidad:"1 Gbps", medio:"Cobre Cat6 (conmutador de aula)",
        vlans:[30], ip:"10.10.30.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

      { id:"l-ap-laptop", a:"ap-aulas", b:"laptop", tipo:"wifi", rotulo:"Wi-Fi 6 · 5 GHz",
        nombre:"Enlace inalámbrico (SSID Alumnos)", velocidad:"Hasta 1.2 Gbps (radio)",
        medio:"802.11ax · 5 GHz · WPA3", vlans:[30], ip:"10.10.30.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

      { id:"l-cctv-cam", a:"sw-cctv", b:"camaras", tipo:"poe", rotulo:"VLAN 50 · PoE+",
        nombre:"Cámaras PoE", velocidad:"1 Gbps", medio:"Cobre Cat6 · PoE+",
        vlans:[50], ip:"10.10.50.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","tcp","udp","http","https"] },

      { id:"l-cctv-nvr", a:"sw-cctv", b:"nvr", tipo:"acceso", rotulo:"VLAN 50 · 1 Gbps",
        nombre:"Grabador NVR", velocidad:"1 Gbps", medio:"Cobre Cat6",
        vlans:[50], ip:"10.10.50.0/24", estado:"Activo",
        protocolos:["ethernet","arp","ipv4","tcp","udp","http","https"] }
    ],

    /* Anotaciones informativas dibujadas sobre el lienzo (no son dispositivos) */
    anotaciones: [
      { x:1240, y:300, texto:"20× FN-TRAN-SX · fibra MMF", tipo:"info", ancho:270 },
      { x:280,  y:445, texto:"3× FS-124F-POE + 21× FS-148F-POE = 24 conmutadores PoE+", tipo:"info", ancho:340 }
    ]
  },

  /* =====================================================================================================
     ESCENARIOS — cada uno define sus nodos/enlaces propios y, si "comparteBase" es true,
     se le añaden los de baseDespues (las opciones 1-3 comparten la red interna).
     ===================================================================================================== */
  escenarios: {
    /* ---------- ESCENARIO A: situación actual (antes) ---------- */
    antes: {
      nombre: "1 · Situación actual (antes)",
      descripcion: "Red plana sin firewall ni segmentación: MikroTik perimetral, 30 conmutadores heredados y 36 AP Ubiquiti.",
      banda: "Antes",
      compartirBase: false,
      vlans: [
        { id:0, nombre:"Red plana (sin VLAN)", red:"192.168.0.0/24", gw:"192.168.0.1",
          dhcp:"192.168.0.100 – .200 (MikroTik)", color:"#94a3b8",
          uso:"Todos los usuarios, servidores, cámaras y AP en un solo dominio de broadcast" }
      ],
      notas: [
        "Una sola subred 192.168.0.0/24 para ~400 equipos: el dominio de broadcast se satura con tráfico de cámaras y descubrimientos.",
        "Sin firewall: no hay política perimetral, ni segmentación entre usuarios, cámaras y administración.",
        "El MikroTik hace de router y DHCP; no inspecciona tráfico y no aporta registro de eventos.",
        "30 conmutadores de marcas mixtas sin gestión centralizada: VLAN, STP y PoE se configuran puerta por puerta.",
        "Las cámaras PoE (Ruijie) no reciben la potencia requerida: el video parpadea y el monitoreo queda inestable."
      ],
      nodos: [
        { id:"internet", tipo:"nube", nombre:"Internet", info:"Red pública · nube",
          x:800, y:60, vlans:[], estado:"Activo",
          protocolos:["ethernet","ipv4","tcp","udp","dns","http","https"],
          notas:"Mismo enlace de 1 Gbps, pero sin dispositivo de seguridad delante." },

        { id:"mikrotik", tipo:"router", nombre:"MikroTik", info:"Router perimetral actual",
          x:800, y:195, ip:"192.168.0.1", mascara:"/24", mac:"4C:5E:0C:00:00:01", vlan:0, vlans:[0],
          estado:"Operativo", fabricante:"MikroTik", modelo:"CCR / hEX (mixto)",
          interfaces:[{ nombre:"ether1", ip:"WAN (ISP)", modo:"WAN" },
                      { nombre:"ether2", ip:"192.168.0.1/24", modo:"LAN (todo mezclado)" }],
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns"],
          notas:"⚠ Sin firewall: no hay inspección de estado ni segmentación. También reparte DHCP a toda la red." },

        { id:"sw-legacy", tipo:"switch", nombre:"Conmutadores heredados", info:"30 equipos · mixto",
          x:480, y:370, ancho:230, ip:"Sin gestión central", mac:"—", vlan:0, vlans:[0],
          estado:">35% descontinuado", alerta:true, fabricante:"Trendnet · HP · TP-Link · Ruijie",
          modelo:"TEG-240WS (×9, EoS 2010) · TEG-2248WS (×1) · HP 2920-48G · TP-Link (×6)",
          interfaces:[{ nombre:"uplink", ip:"1 Gbps", modo:"Hacia el MikroTik" }],
          protocolos:["ethernet","arp","ipv4","stp"],
          notas:"⚠ Rendimiento insuficiente: operan a 24–48 Gbps por bastidor, por debajo de los >96 Gbps recomendados. 7 conmutadores PoE Ruijie no entregan la potencia requerida para las cámaras." },

        { id:"ap-old", tipo:"ap", nombre:"AP Ubiquiti", info:"36 unidades · 15 fuera de soporte",
          x:1140, y:370, ancho:230, ip:"192.168.0.0/24 (DHCP)", mac:"—", vlan:0, vlans:[0],
          estado:"15 fuera de soporte", alerta:true, fabricante:"Ubiquiti",
          modelo:"UAP-LR (×11) · UAP-LRv2 (×4) · UAP-AC-LR (×21)",
          interfaces:[{ nombre:"eth0", ip:"192.168.0.0/24", modo:"Acceso (sin VLAN)" }],
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
          notas:"SSID único sin segmentación: los invitados conviven con la red interna. 15 unidades están fuera de soporte." },

        { id:"pc-aula", tipo:"pc", nombre:"PCs en red plana", info:"192.168.0.0/24",
          x:340, y:560, ip:"192.168.0.50", mascara:"/24", mac:"00:1A:2B:00:00:50", vlan:0, vlans:[0],
          estado:"Activo", modelo:"PCs de aula y oficina",
          interfaces:[{ nombre:"eth0", ip:"192.168.0.50/24", modo:"DHCP" }],
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
          notas:"Todos los equipos comparten el mismo dominio de broadcast: cualquier equipo puede ver a cualquier otro." },

        { id:"camaras-old", tipo:"camara", nombre:"Cámaras PoE", info:"7 conmutadores PoE inestables",
          x:640, y:560, ancho:200, ip:"192.168.0.0/24", mac:"—", vlan:0, vlans:[0],
          estado:"Inestable", alerta:true, modelo:"Ruijie PoE (sin potencia suficiente)",
          interfaces:[{ nombre:"eth0", ip:"192.168.0.0/24", modo:"DHCP" }],
          protocolos:["ethernet","arp","ipv4","tcp","udp","http"],
          notas:"⚠ Parpadeo, pérdida de video y monitoreo inestable por falta de potencia PoE." },

        { id:"laptop-old", tipo:"portatil", nombre:"Portátil · Wi-Fi", info:"SSID único · sin VLAN",
          x:1140, y:560, ip:"192.168.0.80", mascara:"/24", mac:"00:1A:2B:00:00:80", vlan:0, vlans:[0],
          estado:"Activo", modelo:"BYOD de docente o visitante",
          interfaces:[{ nombre:"wlan0", ip:"192.168.0.80/24", modo:"DHCP" }],
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"],
          notas:"Cualquier invitado con la clave del SSID obtiene una IP interna y alcanza todos los equipos." },

        { id:"racks", tipo:"alerta", nombre:"4 racks con falla crítica", info:"Cafetería · Contabilidad · Buitrón · Idiomas",
          x:480, y:740, ancho:280, vlans:[], estado:"Falla crítica", alerta:true,
          protocolos:[],
          notas:"Cafetería: sin ventiladores y sobrecalentamiento (EoS 2010). Contabilidad: fuente (PSU) fallida, no reparable. Buitrón: sin gabinete, en exterior, daño en puertos. Idiomas: fuente (PSU) fallida, no reparable." }
      ],
      enlaces: [
        { id:"a-isp", a:"internet", b:"mikrotik", tipo:"wan", rotulo:"Uplink · 1 Gbps",
          nombre:"Uplink a Internet", velocidad:"1 Gbps", medio:"Fibra dedicada",
          vlans:[0], ip:"WAN", estado:"Activo",
          protocolos:["ethernet","ipv4","icmp","tcp","udp","dns","http","https"] },

        { id:"a-core", a:"mikrotik", b:"sw-legacy", tipo:"acceso", rotulo:"1 Gbps · red plana",
          nombre:"Enlace al bastidor heredado", velocidad:"1 Gbps", medio:"Cobre Cat5e",
          vlans:[0], ip:"192.168.0.0/24", estado:"Activo",
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns"] },

        { id:"a-ap", a:"mikrotik", b:"ap-old", tipo:"acceso", rotulo:"1 Gbps · sin VLAN",
          nombre:"Enlace a los AP Ubiquiti", velocidad:"1 Gbps", medio:"Cobre Cat5e",
          vlans:[0], ip:"192.168.0.0/24", estado:"Activo",
          protocolos:["ethernet","arp","ipv4","tcp","udp","dhcp","dns","http","https"] },

        { id:"a-pc", a:"sw-legacy", b:"pc-aula", tipo:"acceso", rotulo:"1 Gbps · 192.168.0.0/24",
          nombre:"Acceso de PCs", velocidad:"1 Gbps", medio:"Cobre Cat5e",
          vlans:[0], ip:"192.168.0.0/24", estado:"Activo",
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] },

        { id:"a-cam", a:"sw-legacy", b:"camaras-old", tipo:"poe", rotulo:"PoE · inestable",
          nombre:"Cámaras sobre conmutadores PoE Ruijie", velocidad:"100 Mbps – 1 Gbps", medio:"Cobre · PoE (insuficiente)",
          vlans:[0], ip:"192.168.0.0/24", estado:"Inestable",
          protocolos:["ethernet","arp","ipv4","tcp","udp","http"] },

        { id:"a-wifi", a:"ap-old", b:"laptop-old", tipo:"wifi", rotulo:"2.4 GHz · saturado",
          nombre:"Wi-Fi sin segmentación", velocidad:"54 – 300 Mbps (radio)", medio:"802.11n · 2.4 GHz",
          vlans:[0], ip:"192.168.0.0/24", estado:"Activo",
          protocolos:["ethernet","arp","ipv4","icmp","tcp","udp","dhcp","dns","http","https"] }
      ],
      anotaciones: [
        { x:800, y:300, texto:"⚠ SIN FIREWALL — perímetro sin gestión de seguridad", tipo:"alerta", ancho:420 },
        { x:480, y:640, texto:"⚠ 15 AP fuera de soporte · SSID único sin aislamiento", tipo:"alerta", ancho:360 }
      ]
    },

    /* ---------- ESCENARIO B: después · Opción 1 (FortiGate 200G) ---------- */
    op1: {
      nombre: "2 · Después · Opción 1 (FG-200G)",
      descripcion: "FortiGate 200G stand-alone, 24 FortiSwitch PoE+ gestionados por FortiLink y 15 FortiAP 231K Wi-Fi 7.",
      banda: "Después",
      compartirBase: true,
      bom: "BoM total (sin IVA): USD 90,120.92 · Servicios: 69 h",
      nodos: [],
      enlaces: [],
      anotaciones: []
    },

    /* ---------- ESCENARIO C: después · Opción 2 (HA activo-pasivo) ---------- */
    op2: {
      nombre: "3 · Después · Opción 2 (HA activo-pasivo)",
      descripcion: "Dos FortiGate 200G en alta disponibilidad: failover sin interrupción mediante 2× DAC SFP+ 10GE.",
      banda: "Después",
      compartirBase: true,
      bom: "BoM total (sin IVA): USD 100,450.84 · Servicios: 85 h",
      nodos: [
        { id:"fg2", tipo:"firewall", nombre:"FortiGate 200G", info:"Secundario · PASSIVE",
          x:1060, y:295, ip:"10.10.99.2", mascara:"/24", mac:"00:09:0F:AA:00:02", vlan:99,
          vlans:[10,20,30,40,50,60,99,100,0], estado:"En espera (passive)",
          fabricante:"Fortinet", modelo:"FG-200G-BDL-950-12",
          interfaces:[{ nombre:"wan1", ip:"203.0.113.3/30", modo:"WAN (respaldo)" },
                      { nombre:"ha1/hb1", ip:"Sincronización", modo:"HA (DAC SFP+ 10GE)" }],
          protocolos:["ethernet","vlan","arp","ipv4","icmp","tcp","udp","stp","fortilink","lldp","ssh"],
          notas:"Sincroniza configuración y sesión con el primario. Si el activo falla, asume el tráfico sin interrupción." }
      ],
      enlaces: [
        { id:"l-ha", a:"fg1", b:"fg2", tipo:"ha", rotulo:"HA · DAC SFP+ 10GE",
          nombre:"Enlace de sincronización HA", velocidad:"10 Gbps", medio:"2× FN-CABLE-SFP+3 (DAC 3 m)",
          vlans:[0], ip:"Sincronización activo-pasivo", estado:"Activo",
          protocolos:["ethernet","arp","ipv4"] },

        { id:"l-fg2-core", a:"fg2", b:"sw-core", tipo:"fortilink", rotulo:"Standby · 10 Gbps",
          nombre:"FortiLink de respaldo", velocidad:"10 Gbps", medio:"Fibra MMF",
          vlans:[10,20,30,40,50,60,99,100], ip:"Trunk", estado:"En espera",
          protocolos:["ethernet","vlan","stp","fortilink","lldp"] }
      ],
      anotaciones: [
        { x:930, y:395, texto:"Failover sin interrupción · NP7Lite + CP10", tipo:"info", ancho:330 }
      ]
    },

    /* ---------- ESCENARIO D: después · Opción 3 (FortiGate 400G) ---------- */
    op3: {
      nombre: "4 · Después · Opción 3 (FG-400G)",
      descripcion: "FortiGate 400G stand-alone: NP7 + CP10, fuentes duales AC de serie y mayor densidad SFP28.",
      banda: "Después",
      compartirBase: true,
      bom: "BoM total (sin IVA): USD 110,458.20 · Servicios: 74 h",
      nodos: [],
      enlaces: [],
      anotaciones: []
    }
  },

  /* =====================================================================================================
     PROTOCOLOS — con: capa, color, resumen, analogía, cabeceras de ejemplo y dónde circulan.
     El campo "capa" indica la capa OSI (1-7) donde vive el protocolo.
     ===================================================================================================== */
  protocolos: [
    { id:"ethernet", nombre:"Ethernet", corto:"Tramas (802.3)", capa:2, color:"#64748b",
      resumen:"Define cómo se empaquetan los datos en una trama con direcciones MAC de origen y destino, y cómo se detectan colisiones y errores (FCS).",
      analogia:"El sobre con las direcciones escritas a mano: indica quién envía y quién recibe en el mismo tramo de cable.",
      cabeceras:[["MAC destino","00:09:0F:11:99:11"],["MAC origen","00:1A:2B:30:00:21"],
                 ["Tipo / Longitud","0x0800 (IPv4)"],["Payload (datos)","46–1500 bytes"],["FCS","CRC-32"]],
      donde:"Circula en todos los enlaces cableados (trunk, acceso, PoE) y también encapsula el Wi-Fi." },

    { id:"vlan", nombre:"VLAN (802.1Q)", corto:"Etiquetado", capa:2, color:"#0ea5e9",
      resumen:"Añade una etiqueta de 4 bytes a la trama Ethernet para identificar a qué VLAN pertenece, permitiendo que un mismo cable transporte varias redes lógicas separadas.",
      analogia:"Un colores de carpeta pegado al sobre: el conmutador sabe en qué estante (red) debe dejarlo sin abrirlo.",
      cabeceras:[["MAC destino","00:09:0F:AA:00:01"],["MAC origen","00:09:0F:11:99:11"],
                 ["802.1Q TPID","0x8100"],["VLAN ID + PRI","30 (prioridad 0)"],["Tipo","0x0800 (IPv4)"]],
      donde:"Solo en enlaces tronco (trunk): FortiLink, troncos al núcleo y enlaces a los AP." },

    { id:"arp", nombre:"ARP", corto:"Resolución MAC", capa:2, color:"#d97706",
      resumen:"Descubre la dirección MAC asociada a una IP. Pregunta en broadcast «¿quién tiene esta IP?» y la dueña responde con su MAC.",
      analogia:"Gritar en un salón «¿quién es el dueño del asiento 10.10.30.1?» y que levante la mano quien corresponda.",
      cabeceras:[["Tipo de hardware","Ethernet (1)"],["Tipo de protocolo","IPv4 (0x0800)"],
                 ["Operación","1 = solicitud · 2 = respuesta"],["MAC origen","00:1A:2B:30:00:21"],
                 ["IP origen","10.10.30.21"],["MAC destino","FF:FF:FF:FF:FF:FF (solicitud)"],
                 ["IP destino","10.10.30.1"]],
      donde:"Al inicio de cada conversación: el PC resuelve la MAC de su puerta de enlace (o del destino si está en la misma subred)." },

    { id:"ipv4", nombre:"IPv4", corto:"Direccionamiento", capa:3, color:"#2563eb",
      resumen:"Paquete lógico con origen, destino, TTL y protocolo. Rotea el paquete de red a red hasta su destino; los conmutadores no lo modifican, los routers sí (TTL).",
      analogia:"El sobre con las direcciones postales completas: sirve para cruzar barrios, ciudades y países.",
      cabeceras:[["Versión / IHL","4 / 5 (20 bytes)"],["TTL","64 → 63 al enrutar"],
                 ["Protocolo","1 ICMP · 6 TCP · 17 UDP"],["Origen","10.10.30.21"],["Destino","10.10.60.10"],
                 ["Checksum","Cabecera (recomputado)"]],
      donde:"En cada salto entre redes: del PC al firewall, entre VLANes y hacia Internet." },

    { id:"icmp", nombre:"ICMP", corto:"Diagnóstico", capa:3, color:"#16a34a",
      resumen:"Protocolo de control y diagnóstico de la capa 3: mensajes de destino inalcanzable, TTL agotado y el clásico echo request/reply del ping.",
      analogia:"Un timbre y un eco: llamas (request) y esperas que suene la respuesta (reply).",
      cabeceras:[["Tipo","8 = echo request · 0 = echo reply"],["Código","0"],["Checksum","16 bits"],
                 ["Identificador","0x1234"],["Secuencia","1"],["Datos","32 bytes (timestamp)"]],
      donde:"Ping entre cualquier par de dispositivos y mensajes de error del firewall al descartar paquetes." },

    { id:"tcp", nombre:"TCP", corto:"Conexión fiable", capa:4, color:"#7c3aed",
      resumen:"Transporte orientado a conexión: apertura de tres vías (SYN, SYN-ACK, ACK), numeración de bytes, confirmaciones y retransmisión. Base de HTTP, HTTPS y SSH.",
      analogia:"Una conversación telefónica: primero marcas y confirmas que escuchan, luego hablas y preguntas «¿me oyes?».",
      cabeceras:[["Puerto origen","54321"],["Puerto destino","80 / 443"],["Secuencia / ACK","n / m"],
                 ["Flags","SYN · ACK · PSH · FIN"],["Ventana","64240 bytes"],["Checksum","16 bits"]],
      donde:"Páginas web, SSH y cualquier dato que no pueda perderse." },

    { id:"udp", nombre:"UDP", corto:"Sin conexión", capa:4, color:"#0891b2",
      resumen:"Transporte mínimo y rápido: sin conexión, sin confirmación. Ideal cuando la velocidad importa más que la retransmisión (DNS, DHCP, VoIP, vídeo).",
      analogia:"Mandar una postal: la pones en el buzón y sigues, sin confirmar si llegó.",
      cabeceras:[["Puerto origen","53310"],["Puerto destino","53 / 67-68 / 5060"],
                 ["Longitud","8 bytes de cabecera"],["Checksum","16 bits"]],
      donde:"Consultas DNS, mensajes DHCP, voz (RTP) y streaming de las cámaras." },

    { id:"dhcp", nombre:"DHCP", corto:"Asignación de IP", capa:7, color:"#db2777",
      resumen:"Asigna IP, máscara, puerta de enlace y DNS automáticamente mediante el intercambio DORA: Discover, Offer, Request y Acknowledge.",
      analogia:"Al llegar a la recepción te dan una cama (IP) con su número de habitación (gateway y DNS).",
      cabeceras:[["Mensaje","DHCPDISCOVER / OFFER / REQUEST / ACK"],["xid","0x3F2A1C01"],
                 ["IP ofrecida","10.10.30.150"],["Máscara","255.255.255.0"],["Puerta de enlace","10.10.30.1"],
                 ["Servidor DNS","10.10.60.10"],["Tiempo de vida","86400 s"]],
      donde:"Servidor 10.10.60.10; el firewall hace de relay para llegar a cualquier VLAN.",
      secuencia:[
        "DHCPDISCOVER — el PC sin IP pregunta en broadcast: «¿hay algún servidor DHCP?»",
        "DHCPOFFER — el servidor ofrece 10.10.30.150/24 con gateway, DNS y tiempo de vida.",
        "DHCPREQUEST — el PC acepta la oferta y la confirma en broadcast.",
        "DHCPACK — el servidor confirma y el PC aplica la configuración (IP, máscara, gateway, DNS)."
      ] },

    { id:"dns", nombre:"DNS", corto:"Nombres → IP", capa:7, color:"#ea580c",
      resumen:"Traduce nombres legibles (www.labsredestest.edu.co) en direcciones IP. Viaja en UDP/53 (y TCP/53 para respuestas grandes o transferencias de zona).",
      analogia:"La guía telefónica: llamas preguntando «¿cuál es el número de labsredestest?» y te contestan con la IP.",
      cabeceras:[["ID de transacción","0x2201"],["Pregunta","www.labsredestest.edu.co"],
                 ["Tipo / Clase","A (IPv4) / IN"],["Respuesta","198.51.100.20 · TTL 300 s"]],
      donde:"Consultas desde cualquier VLAN hacia el servidor 10.10.60.10 y hacia los DNS públicos." },

    { id:"http", nombre:"HTTP", corto:"Páginas web", capa:7, color:"#9333ea",
      resumen:"Protocolo de aplicación para transferir páginas: peticiones GET/POST y respuestas con código de estado (200 OK, 404 No encontrado).",
      analogia:"Pedir un plato del menú (petición) y que te lo sirvan (respuesta).",
      cabeceras:[["Método","GET"],["Ruta","/aulas.html"],["Host","www.labsredestest.edu.co"],
                 ["HTTP","1.1"],["User-Agent","Mozilla/5.0"],["Respuesta","200 OK · text/html"]],
      donde:"Portal web interno (10.10.60.10) y navegación general por el perímetro." },

    { id:"https", nombre:"HTTPS", corto:"Web cifrada", capa:7, color:"#6d28d9",
      resumen:"HTTP dentro de una sesión TLS cifrada: confidencialidad, integridad y autenticación del servidor mediante certificados.",
      analogia:"El mismo pedido del restaurante, pero susurrado dentro de una caja cerrada con llave.",
      cabeceras:[["Handshake TLS","ClientHello · ServerHello · Certificate"],
                 ["Cipher suite","TLS_AES_256_GCM_SHA384"],["Certificado","CN=www.labsredestest.edu.co"],
                 ["Dentro","HTTP (GET / …)"],["Puerto","443"]],
      donde:"Cualquier sitio externo y el portal interno si se publica con certificado." },

    { id:"rtp", nombre:"Voz IP (SIP + RTP)", corto:"Telefonía", capa:7, color:"#be185d",
      resumen:"SIP establece y termina la llamada (señalización) y RTP transporta el audio en tiempo real por UDP, con marcas de tiempo para sincronizar.",
      analogia:"SIP es quien organiza la reunión; RTP es la conversación en sí, hablada por ráfagas cortas.",
      cabeceras:[["SIP","INVITE · 200 OK · ACK · BYE (UDP/TCP 5060)"],["RTP","Payload G.711 / Opus"],
                 ["Puertos RTP","10000–20000 (UDP)"],["Marca de tiempo","ms desde el inicio"],
                 ["SSRC","Identificador de flujo"]],
      donde:"Entre los teléfonos IP (VLAN 40) con prioridad QoS en el firewall." },

    { id:"stp", nombre:"RSTP (STP)", corto:"Bucles", capa:2, color:"#475569",
      resumen:"Árbol de expansión: bloquea enlaces redundantes para que no se formen bucles de broadcast que tumbarían la red; si un enlace falla, reactiva en milisegundos.",
      analogia:"Un laberinto con una sola salida marcada: si se cierra, se reabre otra automáticamente.",
      cabeceras:[["BPDU","Tipo 0x00 · flag 0x7c"],["Root Bridge","00:09:0F:11:99:11"],
                 ["Costo de ruta","4 · 12 · 19"],["Estado del puerto","Blocking → Forwarding"]],
      donde:"Entre conmutadores (troncos al núcleo) para tolerar fallas sin bucles." },

    { id:"fortilink", nombre:"FortiLink", corto:"Gestión Fortinet", capa:2, color:"#117A8B",
      resumen:"Enlace propietario entre FortiGate y FortiSwitch: el firewall administra los conmutadores y sus puertos aparecen como interfaces propias (número de puerto fortiguard).",
      analogia:"Un cable de mando: el firewall es el capataz y los switches sus herramientas numeradas.",
      cabeceras:[["Descubrimiento","FortiLink Discovery (sobre LLDP)"],["Gestión","SSH/HTTPS al switch"],
                 ["Puertos","Agrupados como port1, port2… del FortiGate"],["Tronco","802.1Q con VLAN nativa 0"]],
      donde:"En el enlace fg1 ↔ sw-core (y el de respaldo en la opción HA)." },

    { id:"lldp", nombre:"LLDP", corto:"Descubrimiento", capa:2, color:"#0f766e",
      resumen:"Protocolo estándar de capa 2 con el que los equipos anuncian quiénes son, por qué puerto están conectados y qué VLAN permiten (vecinos).",
      analogia:"Una tarjeta de presentación que cada equipo deja en la mesa antes de hablar.",
      cabeceras:[["Chasis ID","MAC del equipo"],["Puerto ID","port24"],["TTL","120 s"],
                 ["Descripción","FS-148F-POE · Firmware 7.4"]],
      donde:"Entre todos los conmutadores y AP; también lo usa FortiLink para auto-descubrir vecinos." },

    { id:"ssh", nombre:"SSH", corto:"Gestión segura", capa:7, color:"#0d9489",
      resumen:"Canal cifrado para administrar equipos de forma remota (CLI, transferencia de archivos). Reemplaza a Telnet, que envía todo en claro.",
      analogia:"Una cabina insonorizada con llave: solo tú escuchas y solo tú das órdenes.",
      cabeceras:[["Versión","SSH-2.0"],["Algoritmo de intercambio","curve25519-sha256"],
                 ["Cifrado","aes256-gcm@openssh.com"],["Puerto","22"],["Dentro","CLI del FortiGate / switch"]],
      donde:"Administración del firewall (VLAN 99) y de los conmutadores gestionados." }
  ],

  /* =====================================================================================================
     GLOSARIO — términos y conceptos de la pestaña Glosario.
     ===================================================================================================== */
  glosario: [
    { t:"Encapsulación", c:"Conceptos", d:"Proceso por el que cada capa añade su propia cabecera (y cola) a los datos de la capa superior: HTTP → TCP → IP → Ethernet." },
    { t:"PDU", c:"Conceptos", d:"Unidad de datos de cada capa: datos (capa 7-5), segmento (4), paquete (3), trama (2) y bits (1)." },
    { t:"Capa OSI", c:"Conceptos", d:"Modelo de 7 capas que divide las comunicaciones: física, enlace, red, transporte, sesión, presentación y aplicación." },
    { t:"MAC", c:"Direcciones", d:"Dirección física grabada en la tarjeta de red (48 bits, p. ej. 00:1A:2B:30:00:21). Útil en el mismo segmento." },
    { t:"IP", c:"Direcciones", d:"Dirección lógica que identifica un equipo en una red (IPv4: 4 octetos). Cambia si el equipo se muda de red." },
    { t:"Máscara de red", c:"Direcciones", d:"Indica cuántos bits identifican la red (p. ej. /24 = 255.255.255.0). Permite calcular red, broadcast y hosts útiles." },
    { t:"Puerta de enlace (gateway)", c:"Direcciones", d:"IP del router al que un equipo envía todo el tráfico que está fuera de su subred (p. ej. 10.10.30.1)." },
    { t:"Subred", c:"Direcciones", d:"Red lógica más pequeña creada al subdividir otra; en este proyecto cada VLAN es una subred /24." },
    { t:"RFC 1918 (IP privada)", c:"Direcciones", d:"Rangos 10.0.0.0/8, 172.16.0.0/12 y 192.168.0.0/16 reservados para uso interno; no se enrutan por Internet (se ocultan con NAT)." },
    { t:"NAT", c:"Direcciones", d:"Traducción de direcciones: el firewall sustituye la IP privada por la pública al salir, y revierte al volver." },
    { t:"Broadcast", c:"Conceptos", d:"Mensaje dirigido a todos los equipos del segmento (MAC FF:FF:FF:FF:FF:FF). En exceso, satura la red." },
    { t:"VLAN", c:"Segmentación", d:"Red lógica dentro de un mismo cable: separa tráfico (datos, voz, CCTV) sin duplicar infraestructura." },
    { t:"Trunk (802.1Q)", c:"Segmentación", d:"Enlace que transporta varias VLANes etiquetadas entre conmutadores o hacia el firewall." },
    { t:"Puerto de acceso", c:"Segmentación", d:"Puerto que pertenece a una sola VLAN y la «desetiqueta» para el equipo conectado (PC, cámara, AP)." },
    { t:"Dominio de broadcast", c:"Segmentación", d:"Conjunto de equipos que reciben los broadcasts de un segmento. Dividirlo en VLANes lo reduce y lo ordena." },
    { t:"Segmentación", c:"Segmentación", d:"Dividir la red en zonas con reglas de acceso: usuarios, servidores, voz, CCTV. Base de toda defensa en profundidad." },
    { t:"Firewall", c:"Seguridad", d:"Dispositivo que filtra y controla el tráfico entre zonas según reglas, e inspecciona el estado de las conexiones." },
    { t:"Seguridad perimetral", c:"Seguridad", d:"Política en la frontera de la red: qué entra, qué sale y con qué permisos; registro de eventos y actualizaciones." },
    { t:"Alta disponibilidad (HA)", c:"Seguridad", d:"Dos firewalls sincronizados (activo-pasivo): si el primario falla, el secundario asume el tráfico sin caída." },
    { t:"Inspección de estado", c:"Seguridad", d:"El firewall recuerda las conexiones salientes y solo deja volver el tráfico solicitado, sin reglas explícitas de vuelta." },
    { t:"ARP", c:"Protocolos", d:"Resuelve IP → MAC dentro del segmento; la tabla ARP guarda esos emparejamientos." },
    { t:"DHCP (DORA)", c:"Protocolos", d:"Asignación automática de IP: Discover, Offer, Request, Acknowledge." },
    { t:"DNS", c:"Protocolos", d:"Resuelve nombres a IP (y viceversa, PTR). Aquí centralizado en 10.10.60.10." },
    { t:"TTL", c:"Protocolos", d:"Tiempo de vida de un paquete: cada router lo decrementa en 1; si llega a 0 se descarta y se notifica con ICMP." },
    { t:"Ping (ICMP)", c:"Protocolos", d:"Prueba de alcance: echo request y echo reply. Mide si el destino responde y cuánto tarda (RTT)." },
    { t:"Puertos TCP/UDP", c:"Protocolos", d:"Números que identifican el servicio: 80 HTTP, 443 HTTPS, 53 DNS, 67/68 DHCP, 22 SSH, 5060 SIP." },
    { t:"Wi-Fi 6 / 6E / 7", c:"Inalámbrico", d:"Estándares 802.11ax/be con más eficiencia en ambientes con muchos equipos (OFDMA, MU-MIMO)." },
    { t:"SSID", c:"Inalámbrico", d:"Nombre de la red inalámbrica visible; en este diseño hay uno por segmento (Alumnos, Invitados)." },
    { t:"WPA3", c:"Inalámbrico", d:"Actual cifrado de las redes Wi-Fi; obligatorio para proteger el tráfico inalámbrico de invitados." },
    { t:"PoE (802.3af/at)", c:"Capa física", d:"Alimentación sobre el cable de red: permite instalar cámaras y AP sin tomacorriente." },
    { t:"Fibra MMF (FN-TRAN-SX)", c:"Capa física", d:"Transceptores de fibra multimodo para enlaces de 1/10 Gbps entre bastidores y edificios." },
    { t:"Switch gestionado", c:"Equipos", d:"Conmutador configurable: VLAN, troncos, QoS, PoE y monitoreo desde una consola central." },
    { t:"AP (punto de acceso)", c:"Equipos", d:"Puente entre el mundo cableado y los clientes Wi-Fi; aquí los FortiAP se administran desde el FortiGate." },
    { t:"Router-on-a-stick", c:"Equipos", d:"Un solo enlace tronco al router con subinterfaces 802.1Q: cada VLAN tiene su propia IP de puerta de enlace." },
    { t:"FortiLink", c:"Equipos", d:"Enlace propietario Fortinet que permite gestionar los FortiSwitch como si fueran interfaces del firewall." },
    { t:"QoS", c:"Conceptos", d:"Priorización del tráfico: en este diseño la voz (VLAN 40) viaja por encima de datos y vídeo." },
    { t:"CCTV sobre IP", c:"Conceptos", d:"Cámaras que envían vídeo por la red (RTSP/HTTP); necesita VLAN propia, PoE suficiente y ancho de banda reservado." }
  ]
};
