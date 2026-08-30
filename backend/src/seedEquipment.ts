import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Equipment from './models/Equipment';

dotenv.config();

const mapEq = (nama: string, lokasiArr: string[], mainCat: 'Faskampen' | 'Elban', subCat?: 'Fasilitas IT' | 'Fasilitas Penunjang Bandar Udara', merek: string = '-') => {
  return lokasiArr.map(lokasi => ({
    namaPeralatan: nama,
    lokasi: lokasi,
    merek: merek,
    mainCategory: mainCat,
    ...(subCat && { subCategory: subCat })
  }));
};

// 1. DATA FASKAMPEN
const cctvLokasi = [
  "Main Gate / Gateway 1", "Main Gate / Gateway 2", "Main Gate / Gateway 3", "Bea Cukai 1", "Bea Cukai 2", "Bea Cukai 3", 
  "Masjid", "Bedeng", "Parkir Motor / Anugrah", "Air Mancur", "Bravo 1", "Bravo 4", "Bravo PK 7", "Bravo 10 1", "Bravo 10 2", 
  "Airside B7 sec 01", "Charlie", "Charlie sec 01", "Enggang", "EOC", "Pintu LaUd sec 01", "Pintu LaUd sec 02", "Alfa 1", 
  "Alfa 2", "Cam Make Up Tengah", "Alfa 0", "Depan Teknik (SMP)", "Perimeter 2", "Perimeter 3", "Perimeter 4", "Perimeter 5", 
  "Perimeter 6", "Perimeter 7", "Perimeter 8", "Perimeter 9", "Lobby Pintu Keberangkatan", "Lobby Pintu Kedatangan 1", 
  "Batik Mushola", "Batik Pojok", "Batik Tengah 1", "Conveyor Luar Kedatangan (kiri)", "Kedatangan Lorong", "Lobby Peduli Lindungi", 
  "Lobby Informasi", "Ruang Kedatangan", "Ruang Tunggu Citilink (Gate 6)", "SCP1 (kanan)", "SCP1 (kiri)", "Tangga Adkom", 
  "Tangga HTC", "Baggage Claim Conveyor 1", "Baggage Claim Conveyor 2", "Conveyor Luar Kedatangan (kanan)", "ATM Kedatangan", 
  "Check In Batik", "Check In Citilink", "Lobby Kedatangan 2", "PSC", "Batik Lorong", "Batik Tengah 2", "SCP 2", "SCP 1 In (kiri)", 
  "SCP 1 In (kanan)", "Bording Check SCP 2", "SCP 1 Out (kanan)", "SCP 2 In (kanan)", "SCP 2 In (kiri)", "SCP 2 Out (kiri)", 
  "SCP 2 Out (kanan)", "Conveyor BHS (kiri)", "Conveyor BHS (kanan)", "In BHS (kanan)", "In BHS (kiri)", "Make Up Keberangkatan (kanan)", 
  "Make Up Keberangkatan (kiri)", "Out BHS (kanan)", "Out BHS (kiri)", "Pintu Karyawan", "Ruangan Pintu LaUd", "Kedatangan 1", 
  "Kedatangan 2", "Kedatangan 3", "Kedatangan 4", "Kedatangan 5", "Kedatangan 6", "Kedatangan 7", "Kedatangan 8", "Kedatangan 9", 
  "Kedatangan 10", "Kedatangan 11", "Kedatangan 12", "Gate 4 Citilink", "Check In Counter Batik 2", "Ruang Rekonsiliasi", 
  "Runway 24", "SMP", "ATM Keberangkatam", "Ruang EOC", "Eskalator Naik (in)", "Eskalator Naik (out)", "Eskalator Turun (in)", 
  "Eskalator Turun (out)", "Keberangkatan sec 01", "Keberangkatan sec 02", "Keberangkatan sec 03", "Informasi sec 01", 
  "Informasi sec 02", "Informasi sec 03", "Kedatangan sec 01", "Kedatangan sec 02", "Kedatangan sec 03", "Lorong VIP", 
  "Enggang sec 01", "Enggang sec 02", "Lorong Make Up sec 01", "Lorong Make Up sec 02", "Kanopi kedatangan", "Kedatangan Luar", 
  "Isolated Area sec 01", "Isolated Area sec 02", "Isolated Area sec 03", "Runway 06", "Akses Listrik Sec 01", "Akses Listrik Sec 02", 
  "Perimeter 7 sec 01", "Perimeter 7 sec 02", "Taxiway Alfa", "Perimeter 3 sec 01", "Charlie sec 02", "Airside B7 sec 02", 
  "Alfa 1 sec 01", "Alfa 1 sec 02", "Runway 24 Sec 01", "Runway 24 Sec 02", "Runway 24 Sec 03", "BL CITILINK 01", "BL CITILINK 02", 
  "BL CITILINK 03", "BL CITILINK 04", "BL CITILINK 05", "XRAY LINE E IN", "XRAY LINE E OUT", "Batik Pojok 2", "Perimeter 10 sec 01", 
  "Perimeter 10 sec 02", "Koridor SCP 2", "X-Ray Bea Cukai", "Terminal Check In", "Perimeter 2 sec 01", "Perimeter 4 sec 01", 
  "Perimeter 4 sec 02", "Parkir 2 sec 01", "Parkir 2 sec 02", "Parkir 2 sec 03", "Parkir 2 sec 04", "Parkir 3 sec 01", "Parkir 3 sec 02", 
  "Parkir 4 sec 01", "Parkir 4 sec 02", "Parkir 4 sec 03", "Parkir 4 sec 04", "Emergency Batik", "Cardig sec 01", "Cardig sec 02", 
  "Cardig sec 03", "Tangga Manual Batik In", "Tangga Manual Batik Out", "Lorong Batik New"
];

const dataFaskampen = [
  ...mapEq('ETD Portable', ['Terminal Sewa'], 'Faskampen', undefined, 'Hikvision'),
  ...mapEq('X-Ray Bagasi', ['Semi BHS Batik', 'Semi BHS Citilink', 'VIP (SMP)', 'SCP Cadangan'], 'Faskampen', undefined, 'Smith'),
  ...mapEq('X-Ray Cabin', ['SCP2 Line C', 'SCP2 Line D', 'SCP2 Line E', 'Pintu LaUd', 'Pintu Karyawan', 'Ruang Konsesi'], 'Faskampen', undefined, 'Smith'),
  ...mapEq('WTMD', ['SCP1 Cadangan', 'SCP2 Line E', 'Pintu Karyawan', 'SCP2 Line C', 'SCP2 Line D', 'VIP (SMP)', 'Pintu LaUd'], 'Faskampen', undefined, 'CEIA'),
  ...mapEq('HHMD', ['SCP1 Line Cadangan', 'VIP (SMP)', 'SCP2 Line C', 'SCP2 Line D', 'SCP2 Line E', 'Pintu Karyawan', 'Pintu LaUd', 'Pintu Arrival'], 'Faskampen', undefined, 'CEIA'),
  ...mapEq('Access Control', ['Escalator Turun (Gate 8)', 'Gate 4', 'Gate 6', 'Gate 5', 'Gate 7', 'GM Ops.', 'Ruang Server 300', 'Disable Citilink', 'Teknik', 'Escalator Naik', 'Ruang Server Kedatangan', 'Gate 7a (ex Susi)', 'Emergency Batik'], 'Faskampen'),
  ...mapEq('CCTV Camera', cctvLokasi, 'Faskampen', undefined, 'Sony/Eyenor/Hikvision'),
  ...mapEq('Server CCTV', ['DELL 01', 'DELL 02', 'SUPERMICRO 01', 'SUPERMICRO 02', 'SUPERMICRO 03', 'SUPERMICRO 04', 'THINKSERVER1', 'THINKSERVER2', 'DELL EMC01', 'DELL EMC02'], 'Faskampen', undefined, 'DELL/Lenovo'),
  ...mapEq('Client CCTV', ['AVSEC 1', 'AVSEC 2', 'AVSEC 3', 'AMC', 'Teknik', 'EOC', 'EGM 1', 'EGM 2', 'TOC', 'Ruang Server'], 'Faskampen', undefined, 'PC Client'),
  ...mapEq('Monitor Client CCTV', ['AVSEC 1', 'AVSEC 2', 'AVSEC 3', 'AMC', 'Teknik', 'EOC', 'EGM 1', 'EGM 2', 'TOC', 'Ruang Server'], 'Faskampen', undefined, 'Monitor')
];

// 2. DATA ELBAN - IT
const fidsLokasi = ['Departure (Info)', 'Departure (Lobby)', 'Check In Counter 1', 'Citilink (Gate 4) A', 'Citilink (Gate 4) B', 'Citilink (Gate 4) C', 'Citilink (Gate 4) D', 'Batik Lorong', 'Batik Emergency Exit', 'Batik Indomaret', 'Departure (Ruang EOC)', 'Arrival (Ruang EOC)', 'Break Down Area', 'Baggge Claim Area Lorong', 'Baggage Claim 01', 'Baggage Claim 02', 'Baggage Claim 03', 'Arrival (Lobby)', 'Departure (TIS)', 'Arrival (TIS)', 'Departure (OIC)', 'Arrival (OIC)', 'Departure (PKPPK)', 'Arrival (PKPPK)', 'Departure (Check In Counter 2)', 'Departure (Rekonsiliasi)', 'Arrival (Rekonsiliasi)', 'Departure (Posko avsec)', 'Arrival (Posko Avsec)', 'Ruang Server (Main)', 'Ruang Server (Backup)'];
const radiolinkLokasi = ['Terminal to PK Selatan', 'PK Selatan to Terminal', 'Perimeter 3 to Perimeter 7', 'Perimeter 7 to Perimeter 3', 'Perimeter 4 to Perimeter 6', 'Perimeter 6 to Perimeter 4', 'Perimeter 4 to Perimeter 5', 'Perimeter 5 to Perimeter 4', 'WC Pintu LaUd to Pintu LaUd', 'Pintu LaUd to WC Pintu LaUd', 'Airside B10 to Airside Charlie', 'Airside Charlie to Airside B10', 'Airnav to Gedung Teknik', 'Gedung Teknik to Airnav', 'PK Selatan sec 01 to Runway 24', 'Runway 24 to PK Selatan sec 01', 'Perimeter 10 to PK Selatan NS LOCO', 'PK Selatan NS LOCO to Perimeter 10', 'CCTV Perimeter 10 to Perimeter 7', 'CCTV Perimeter 7 to Perimeter 10', 'Perimeter 9 to PK Selatan TP-Link', 'PK Selatan TP-Link  to Perimeter 9', 'CCTV Masjid to CCTV Parkir 3', 'CCTV Parkir 3 to CCTV Masjid', 'CCTV Parkir 3 to CCTV Parkir 2', 'CCTV Parkir 2 to CCTV Parkir 3', 'CCTV Parkir 3 to CCTV Parkir 4', 'CCTV Parkir 4 to CCTV Parkir 3', 'CCTV Parkir 4 to CCTV Parkir 5', 'CCTV Parkir 5 to CCTV Parkir 4', 'CCTV Parkir 5 to CCTV Parkir 6', 'Airside Charlie to Airside Cardig', 'Airside Cardig to Airside Charlie', 'Air mancur to Anugerah', 'Anugerah to Air mancur'];
const switchLokasi = ['Mikrotik Switch Fire Alarm', 'Mikrotik Access ADM TLMP', 'Mikrotik Switch Posko AVSEC', 'Mikrotik GATEWAY CCTV', 'Mikrotik Switch CCTV Bagage Claim', 'ROUTEROS Switch CCTV 1 Posko AVSEC', 'Mikrotik PAPA 2', 'Mikrotik Perimeter 7', 'Mikrotik CCTV to Musholla', 'ROUTEROS Switch Parkiran 4', 'ROUTEROS Switch  Parkir 3', 'ROUTEROS Switch Parkir 2', 'ROUTEROS Switch CCTV Masjid', 'ROUTEROS SMP VIP', 'ROUTEROS FO Fire Alarm to 300', 'ROUTEROS FO AVSEC to 300', 'ROUTEROS FO AMC to 300', 'Mikrotik Switch OIC', 'ROUTEROS Switch EOC', 'ROUTEROS Perimeter 3', 'ROUTEROS Perimeter 10', 'Mikrotik Airside B10', 'Mikrotik CORE SERVER', 'Mikrotik Switch Divtek', 'Mikrotik New Musholla Divtek', 'Mikrotik Server FAS', 'Mikrotik Fire Alarm PK Selatan', 'Mikrotik Switch CCTV 0 PK Selatan', 'Mikrotik Server IP PABX', 'ROUTEROS CCTV Kedatangan', 'ROUTEROS CSP', 'ROUTEROS Rekonsiliasi', 'ROUTEROS Distribution Citilink', 'Mikrotik Box Citilink', 'ROUTEROS Tangga Batik', 'ROUTEROS Distribution Batik', 'ROUTEROS Access New Batik', 'Mikrotik Gate 8 (Escalator)', 'Mikrotik Distribution Utama', 'Mikrotik Distribution Kedua', 'Mikrotik Distribution FO', 'ROUTEROS FO Divtek', 'ROUTEROS Switch AVSEC', 'Mikrotik CCTV AVSEC', 'ROUTEROS Access Check In Counter', 'Mikrotik Distribution Arrival', 'Mikrotik Switch CCTV Baggage Claim', 'Mikrotik Switch TLMP', 'Mikrotik Access Standby TLMP', 'Mikrotik Divtek', 'ROUTEROS Access Pintu LaUd', 'Mikrotik Distribusi PK Selatan', 'Mikrotik AIRNAV', 'Mikrotik New AMC', 'ROUTEROS New Karyono', 'ROUTEROS Switch Server CCTV', 'Mikrotik Rak Server CCTV 02 Lama', 'Mikrotik Switch CCTV 0', 'Mikrotik Switch CCTV 1', 'ROUTEROS BOX Enggang', 'Mikrotik CCTV Bima', 'Mikrotik Ruang Rapat Bima', 'Mikrotik Access EGM Ops', 'ROUTEROS CCTV Runway 24', 'Mikrotik New TOC', 'Mikrotik Internet Utama', 'Mikrotik Source INET', 'Switch Firewall Fortigate'];
const apLokasi = ['UAP AC M ATS 01', 'UAP AC LR ATS 02', 'UAP AC LR ATS 03', 'UAP AC LR ATS 04', 'UAP AC M PK 00', 'UAP AC M PK 01', 'UAP AC M PK 02', 'UAP AC M PK 03', 'UAP AC M Ruang Rapat Bima', 'UAP AC Lite Elektronika', 'UAP AC M ELIT', 'UAP AC LR Batik 01', 'UAP AC LR Batik 02', 'UAP AC LR Batik 03', 'UAP AC LR Batik 04', 'UAP AC Lite Batik 05', 'UAP AC LR Batik 06', 'UAP AC LR SCP 2', 'UAP AC M SCP 2', 'UNIFI Arrival', 'UAP AC M BC 00', 'UAP AC LR BC 02', 'UAP AC LR BC 03', 'UAP AC LR BC 04', 'UAP AC LR Citilink 01', 'UAP AC LR Citilink 02', 'UAP AC LR Citilink 03', 'UNIFI Departure', 'UNIFI Informasi', 'U6 LR CSP 01', 'U6 LR CSP 02', 'U6 LR Batik 01', 'U6 LR Batik 02', 'U6 LR Batik 03', 'UAP U6+ Gate 9', 'UAP U6+ Batik Tengah 2', 'UAP AC M AMC', 'UAP AC LR EGM', 'UAP AC M EGM OPS', 'UAP AC M EME', 'UAP AC Lite Mading Tower', 'UAP AC Lite TLMP', 'UAP TLMP AC', 'UAP AC LR RR OIC', 'UAP AC M Ruang OIC', 'UAP AC M Commercial', 'UAP AC LR Posko', 'UAP AC M VIP SMP', 'UAP AC M Check In', 'UAP AC M CS 01', 'UAP AC M Sapphire', 'UAP AC M Tekum', 'UAP AC M Pintu LaUd', 'UAP AC Lite EOC', 'UAP EOC Koridor', 'UAP Rekonsiliasi', 'UAP AIRNAV', 'UAP AC LR EGM COM', 'UAP AC LR SCP1', 'UAP AC LR New Info', 'UAP AC M Watchroom ARFF', 'UNIFI SECURITY GATEWAY', 'UNIFI CONTROLLER'];

const dataElbanIT = [
  ...mapEq('FIDS Monitor', fidsLokasi, 'Elban', 'Fasilitas IT', 'IBM/Build Up'),
  ...mapEq('Radiolink', radiolinkLokasi, 'Elban', 'Fasilitas IT', 'Ubiquiti/Mikrotik'),
  ...mapEq('Switch Manage', switchLokasi, 'Elban', 'Fasilitas IT', 'Mikrotik/RouterOS'),
  ...mapEq('Access Point', apLokasi, 'Elban', 'Fasilitas IT', 'Ubiquiti/Unifi')
];

// 3. DATA ELBAN - PENUNJANG BANDARA
const pasLokasi = ['Mixer M9000 Server', 'Amplifier Server 1', 'Amplifier Server 2', 'Amplifier Server 3', 'Amplifier Server 4', 'Amplifier Server 5', 'Amplifier Server 6', 'Amplifier Server 7', 'Amplifier Citilink 1', 'Amplifier Citilink 2', 'Amplifier Citilink 3', 'Mixer M9000 Citilink', 'Mixer M9000 Batik', 'Amplifier Batik 1', 'Amplifier Batik 2', 'Amplifier Arrival', 'Mixer M9000 Arrival', 'SERVER AUTOFIS', 'Microphone PAS Information', 'Microphone PAS Batik Gate 8', 'Microphone PAS Batik Gate 9', 'Microphone PAS Batik Gate 10', 'Microphone PAS Citilink Gate 4', 'Microphone PAS Citilink Gate 5', 'Microphone PAS Citilink Gate 6'];
const speakerLokasi = [...Array.from({length:48}).map((_,i)=>`Speaker Citilink ${i+1}`), ...Array.from({length:17}).map((_,i)=>`Speaker SCP ${i+1}`), ...Array.from({length:26}).map((_,i)=>`Speaker Lobby ${i+1}`), ...Array.from({length:38}).map((_,i)=>`Speaker Arrival ${i+1}`), ...Array.from({length:30}).map((_,i)=>`Speaker Batik ${i+1}`)];
const basLokasi = ['Ruang Karyono', 'Check In', 'Ruang Tunggu Citilink', 'Ruang Tunggu Batik', 'Rumah Pompa', 'AHU Citilink', 'Ruang Electric', 'Ruang Panel', 'Ruang PH Genset', 'Gedung Teknik (Server)', 'Teknik Elektro (PC)', 'Teknik Listrik (PC)'];
const fasLokasi = ['MCFA Office', 'MCFA Check In', 'MCFA Ruang Tunggu Batik', 'MCFA Ruang Tunggu Citilink', ...Array.from({length:13}).map((_,i)=>`Smoke Detector Citilink ${i+1}`), ...Array.from({length:18}).map((_,i)=>`Smoke Detector Check In ${i+1}`), 'Bell & Push Button Citilink', 'Bell & Push Button Check In 1', 'Bell & Push Button Check In 2', 'Bell & Push Button Batik', 'Bell & Push Button Office', 'Remote Keypad PK Utara', 'Remote Keypad PK Selatan', 'PC Client PK Utara', 'PC Client PK Selatan', 'PC SERVER Fire Alarm', 'Smoke Detector Arrival'];
const igcsLokasi = ['Repeater', ...Array.from({length:9}).map((_,i)=>`Mobile Station PKP-PK 0${i+1}`), ...Array.from({length:4}).map((_,i)=>`Mobile Station Elektronika 0${i+1}`), ...Array.from({length:11}).map((_,i)=>`Mobile Station Avsec 0${i+1}`), ...Array.from({length:3}).map((_,i)=>`Mobile Station AMC 0${i+1}`), 'Mobile Station Sipil 01', 'Mobile Station Sipil 02', 'Mobile Station TLMP 01', 'Mobile Station TLMP 02', 'Mobile Station TLMP 03', 'Mobile Station OIC 01', 'Mobile Station OIC 02', 'Mobile Station Info 01', 'Mobile Station Info 02', 'Mobile Station Safety 01', 'Mobile Station Airnav 01', 'Mobile Station EGM 01', 'Rig Station AMC', 'Rig Station EOC', 'Rig Station PKPPK', 'Rig Station KOMANDO', 'Rig Station F02', 'Rig Station Avsec'];
const vhfLokasi = ['VHF-REPEATER MOTOROLA Tower', ...Array.from({length:4}).map((_,i)=>`Mobile Operasi 0${i+1}`), ...Array.from({length:5}).map((_,i)=>`Mobile ARFF 0${i+1}`), ...Array.from({length:7}).map((_,i)=>`Mobile HRGA 0${i+1}`), 'Mobile SRQC 01', 'Mobile SRQC 02', 'Mobile INFRASTRUKTUR 01', 'Mobile INFRASTRUKTUR 02', 'Mobile INFRASTRUKTUR 03', 'Mobile ELEKTRONIKA 01', 'Mobile ELEKTRONIKA 02', 'Mobile TLMP 01', 'Mobile TLMP 02', 'Mobile AVSEC 01', 'Mobile AVSEC 02', 'Mobile AVSEC 03', ...Array.from({length:4}).map((_,i)=>`RIG OPERASI 0${i+1}`), ...Array.from({length:3}).map((_,i)=>`RIG ARFF 0${i+1}`), 'RIG AVSEC 01', 'RIG INFRASTRUKTUR 01', 'RIG INFRASTRUKTUR 02'];
const pabxLokasi = ['SERVER PABX', 'Elektronika - 443', 'Listrik - 247', 'Informasi - 216', 'Staff Teknik - 330', 'Bangunan - 337', 'OIC - 230', 'PKPPK Selatan - 358', 'SCP 1 - 504', 'SCP 2 - 266', 'AMC - 352', 'Posko AVSEC - 369', 'IT - 445', 'Staff GM Ops - 221', 'Tower - 270', 'Batik - 488', 'Citilink (Gate 6)', 'HC', 'GM Ops', 'IFM', 'FM - 251', 'GM Com', 'VIP', 'Commercial', 'ASCX', 'Pintu LaUd - 433', 'Kedatangan - 223', 'EOC', 'Rekonsiliasi', 'Garuda (Gate 4)', 'Fly Jaya (Gate 5)', 'PKPPK Utara - 284'];

const dataElbanPenunjang = [
  ...mapEq('PAS (Mixer/Amplifier)', pasLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'TOA'),
  ...mapEq('Speaker Ceiling & Universal', speakerLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'TOA'),
  ...mapEq('Master Clock', ['Check In Counter 1', 'Check In Counter 2', 'Check In Counter 3', 'Lobby 1', 'Lobby 2', 'Lobby 3', 'Lobby 4', 'Informasi', 'OIC', 'EOC', 'Ruang Server'], 'Elban', 'Fasilitas Penunjang Bandar Udara', 'Mobatime'),
  ...mapEq('HMI & Server BAS', basLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'Schneider'),
  ...mapEq('Crash Bell', ['Tower-PK Selatan'], 'Elban', 'Fasilitas Penunjang Bandar Udara'),
  ...mapEq('Fire Alarm System (FAS)', fasLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'BOSCH'),
  ...mapEq('IGCS', igcsLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'Motorola'),
  ...mapEq('HT VHF', vhfLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'Motorola/ICOM'),
  ...mapEq('IP PABX', pabxLokasi, 'Elban', 'Fasilitas Penunjang Bandar Udara', 'Alcatel/Grd'),
  ...mapEq('Monitor Check In (CHC)', Array.from({length:20}).map((_,i)=>`Check In Counter ${i+1}`), 'Elban', 'Fasilitas Penunjang Bandar Udara', 'LG'),
  ...mapEq('Digital Banner & Tampilan', ['Digital Banner SCP 1', 'Digital Banner Check In Counter', 'Digital Iklan SCP 2', 'Videowall Ruang Rapat Bima', 'Videowall Baggage Claim', 'Videowall TOC', 'CTF Citilink', 'CTF Batik', 'Running Text Pintu Keberangkatan', 'Running Text Area BHS', 'Running Text Airside (Gate 5)', 'Running Text Pintu Kedatangan Lama', 'Monitor Petunjuk Lounge Garuda', 'Monitor Petunjuk Lounge Citilink', 'Monitor Petunjuk Lounge Batik Air', 'Monitor Petunjuk Lounge Susi Air', 'Monitor Petunjuk Pintu Difable'], 'Elban', 'Fasilitas Penunjang Bandar Udara'),
  ...mapEq('Mic Conference', [...Array.from({length:20}).map((_,i)=>`Mic Rapat ${i+1} Ruang Rapat Bima`), 'Modul Mic Rapat Bima'], 'Elban', 'Fasilitas Penunjang Bandar Udara')
];

const finalEquipments = [...dataFaskampen, ...dataElbanIT, ...dataElbanPenunjang];

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI as string);
    console.log('⏳ Menghubungkan ke MongoDB...');
    
    await Equipment.deleteMany();
    console.log('🧹 Membersihkan data fasilitas lama...');
    
    await Equipment.insertMany(finalEquipments);
    console.log(`✅ BINGO! ${finalEquipments.length} Data Fasilitas Detail berhasil disuntikkan!`);
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Gagal seeding data:', error);
    process.exit(1);
  }
};

seedDB();