const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxKIukJmIqGE4ZJfF7vyZGh41nXYHFzDtpZiFtzSZgN4NVTlnV06Lwh1FVAKUSP3NGY/exec';
let generatedIDs = [];

window.onload = () => {
    fetchInitialData();
    updateTime();
    setInterval(updateTime, 1000);
};

// --- FETCH DATA DARI GOOGLE SHEETS (SETTINGS + HISTORY ID) ---
function fetchInitialData() {
    fetch(APPS_SCRIPT_URL)
        .then(res => res.json())
        .then(data => {
            generatedIDs = data.ids;
            
            // Terapkan Settings Global
            const settings = data.settings;
            document.getElementById('setSpbuName').value = settings.spbuName || 'SPBU POLONIA';
            document.getElementById('setSpbuAddress').value = settings.spbuAddress || 'JL. Imam Bonjol, Medan Polonia\nTlp. 0614156892';
            document.getElementById('setFooterText').value = settings.footerText || 'ANDA MENDAPAT SUBSIDI DARI PEMERINTAH.\nGUNAKAN SECARA BIJAK.';
            document.getElementById('setOperator').value = settings.opName || 'MHD RIZKY';
            document.getElementById('setHarga').value = settings.hargaBBM || '12600';
            document.getElementById('setFont').value = settings.fontSize || '12';
            document.getElementById('setLogo').value = settings.logoSize || '100';
            
            generateRandomID();
            updatePreview();
            document.getElementById('loadingOverlay').style.display = 'none'; // Sembunyikan loading
        })
        .catch(err => {
            console.error("Gagal load data:", err);
            alert("Gagal terhubung ke Database. Pastikan URL Apps Script benar.");
            document.getElementById('loadingOverlay').style.display = 'none';
        });
}

// --- UPDATE UI REALTIME ---
function updatePreview() {
    const fontSize = document.getElementById('setFont').value;
    const logoSize = document.getElementById('setLogo').value;
    
    document.getElementById('fontVal').innerText = fontSize;
    document.getElementById('logoVal').innerText = logoSize;
    document.documentElement.style.setProperty('--font-size', fontSize + 'px');
    document.documentElement.style.setProperty('--logo-size', logoSize + 'px');

    document.getElementById('outSpbuName').innerText = document.getElementById('setSpbuName').value;
    document.getElementById('outSpbuAddress').innerText = document.getElementById('setSpbuAddress').value;
    document.getElementById('outFooter').innerText = document.getElementById('setFooterText').value;
    
    document.getElementById('outShift').innerText = document.getElementById('inShift').value;
    document.getElementById('outPompa').innerText = document.getElementById('inPompa').value;
    document.getElementById('outProduk').innerText = document.getElementById('inProduk').value;
    document.getElementById('outOperator').innerText = document.getElementById('setOperator').value.toUpperCase();
    
    const harga = document.getElementById('setHarga').value;
    document.getElementById('outHarga').innerText = formatNumber(harga);
    
    const total = document.getElementById('inTotal').value;
    document.getElementById('outTotal').innerText = formatNumber(total);
    document.getElementById('outCash').innerText = formatNumber(total);
    
    document.getElementById('outVolume').innerText = document.getElementById('inVolume').value;
    document.getElementById('outPlat').innerText = document.getElementById('inPlat').value.toUpperCase();
    document.getElementById('outOdo').innerText = document.getElementById('inOdo').value;
}

function calculateVolume() {
    const total = parseFloat(document.getElementById('inTotal').value) || 0;
    const harga = parseFloat(document.getElementById('setHarga').value) || 12600;
    const vol = (total / harga).toFixed(2);
    document.getElementById('inVolume').value = vol;
    updatePreview();
}

function generateRandomID() {
    let newID;
    do {
        newID = Math.floor(100000 + Math.random() * 900000).toString();
    } while (generatedIDs.includes(newID));
    document.getElementById('outTrans').innerText = newID;
}

function formatNumber(num) {
    if(!num) return '0';
    return new Intl.NumberFormat('id-ID').format(num);
}

function updateTime() {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');
    document.getElementById('outWaktu').innerText = `${dd}/${mm}/${yyyy} ${hh}:${min}:${ss}`;
}

// --- API CALL: SIMPAN SETTING GLOBAL ---
function saveSettingsToCloud() {
    document.getElementById('loadingOverlay').style.display = 'flex';
    document.getElementById('loadingOverlay').innerText = 'Menyimpan Pengaturan...';

    const payload = {
        action: "updateSettings",
        payload: {
            spbuName: document.getElementById('setSpbuName').value,
            spbuAddress: document.getElementById('setSpbuAddress').value,
            footerText: document.getElementById('setFooterText').value,
            opName: document.getElementById('setOperator').value,
            hargaBBM: document.getElementById('setHarga').value,
            fontSize: document.getElementById('setFont').value,
            logoSize: document.getElementById('setLogo').value
        }
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    })
    .then(res => res.json())
    .then(res => {
        document.getElementById('loadingOverlay').style.display = 'none';
        alert('Pengaturan Global Berhasil Disimpan!');
    })
    .catch(err => {
         document.getElementById('loadingOverlay').style.display = 'none';
         alert('Gagal menyimpan pengaturan.');
    });
}

// --- API CALL: SIMPAN TRANSAKSI ---
function saveToHistory() {
    const payloadData = {
        waktu: document.getElementById('outWaktu').innerText,
        noTrans: document.getElementById('outTrans').innerText,
        shift: document.getElementById('inShift').value,
        pompa: document.getElementById('inPompa').value,
        produk: document.getElementById('inProduk').value,
        harga: document.getElementById('setHarga').value,
        volume: document.getElementById('inVolume').value,
        total: document.getElementById('inTotal').value,
        operator: document.getElementById('setOperator').value,
        plat: document.getElementById('inPlat').value,
        odometer: document.getElementById('inOdo').value
    };

    fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify({ action: "saveHistory", payload: payloadData })
    })
    .then(res => res.json())
    .then(response => {
        if(response.status === 'success') {
            alert('Transaksi berhasil disimpan!');
            generatedIDs.push(payloadData.noTrans); // Hindari duplikat di sesi yang sama
            generateRandomID(); // Otomatis generate ID baru setelah simpan
        } else {
            alert('Gagal: ' + response.message);
        }
    })
    .catch(error => alert('Error menyimpan: ' + error));
}

// --- PRINT BLUETOOTH ESC/POS COMMANDS ---
async function printESC() {
    if (!navigator.bluetooth) {
        alert('Browser tidak mendukung Bluetooth. Menggunakan Print Browser (Thermal/PDF).');
        window.print(); 
        return;
    }

    try {
        const device = await navigator.bluetooth.requestDevice({
            filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }], 
            optionalServices: ['0000af30-0000-1000-8000-00805f9b34fb'] 
        });
        
        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        const encoder = new TextEncoder();
        
        // ESC/POS Commands
        const CMD_INIT = '\x1B\x40';          // Initialize printer
        const CMD_ALIGN_CENTER = '\x1B\x61\x01'; // Center alignment
        const CMD_ALIGN_LEFT = '\x1B\x61\x00';   // Left alignment
        
        // Ambil Data
        const spbuName = document.getElementById('setSpbuName').value;
        const spbuAddress = document.getElementById('setSpbuAddress').value;
        const footer = document.getElementById('setFooterText').value;

        // Susun Struk Text (Lebar Max ~32 Karakter untuk 58mm default)
        const receiptText = 
CMD_INIT + 
CMD_ALIGN_CENTER + 
`PERTAMINA\n` + 
`${spbuName}\n` + 
`${spbuAddress}\n` + 
`--------------------------------\n` + 
CMD_ALIGN_LEFT + 
`Shift: ${document.getElementById('inShift').value}  No Trans: ${document.getElementById('outTrans').innerText}\n` +
`Waktu: ${document.getElementById('outWaktu').innerText}\n` +
`--------------------------------\n` +
`Pompa       : ${document.getElementById('inPompa').value}\n` +
`Produk      : ${document.getElementById('inProduk').value}\n` +
`Harga/L     : Rp ${formatNumber(document.getElementById('setHarga').value)}\n` +
`Volume      : ${document.getElementById('inVolume').value} L\n` +
`Total       : Rp ${formatNumber(document.getElementById('inTotal').value)}\n` +
`Operator    : ${document.getElementById('setOperator').value}\n` +
`--------------------------------\n` +
`CASH          ${formatNumber(document.getElementById('inTotal').value)}\n` +
`--------------------------------\n` +
`Plat        : ${document.getElementById('inPlat').value.toUpperCase()}\n` +
`Odo Meter   : ${document.getElementById('inOdo').value}\n` +
`--------------------------------\n` +
CMD_ALIGN_CENTER + 
`${footer}\n\n\n\n`; // Spasi extra agar pisau/gigi potong printer pas

        // Karena limit transfer bluetooth kadang kecil, kita kirim byte-nya
        let textBytes = encoder.encode(receiptText);
        let chunkSize = 100;
        for (let i = 0; i < textBytes.length; i += chunkSize) {
            let chunk = textBytes.slice(i, i + chunkSize);
            await characteristic.writeValue(chunk);
        }

        alert('Cetak Bluetooth Berhasil!');
        
    } catch (error) {
        console.error('Koneksi Dibatalkan/Error:', error);
        window.print(); // Fallback
    }
}
