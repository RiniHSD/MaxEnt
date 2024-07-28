/*
<==============================================================================================>
<====================>     Platform Google Earth Engine untuk Pemetaan    <====================>
<====================>     Kesesuaian Habitat Merak Hijau di Pulau Jawa   <====================>
<====================>          dengan Algoritma Maximum Entropy          <====================>
<==============================================================================================>
*/

/*
<======================> Penyiapan dan Preprocessing Data <======================>
*/
// Mengimpor data total spesies, data absence spesies, dan data Region of Interest (ROI)
// Mendefinisikan area studi kasus, basemap, dan skala
var outline = ee.Image().byte().paint({featureCollection: roi, width: 0.5});
Map.addLayer(outline, {palette: 'Snow'}, "Region of Interest");
Map.setOptions('satellite');
Map.centerObject (roi, 8);

/*
<======================> Penentuan dan Penambahan Variabel Lingkungan <======================>
Berikutnya menambahkan data variabel lingkungan yang terdiri atas 7 variabel lingkungan. Variabel
lingkungan tersebut diantaranya:
(1) jenis tutupan lahan,
(2) topografi,
(3) distribusi pemukiman manusia,
(4) kelembapan tanah,
(5) suhu rerata permukaan,
(6) curah hujan, dan
(7) tekanan udara.
*/

// ===========>>>>> Variabel Lingkungan (1): Jenis Tutupan Lahan <<<<<===========
// Data induk: ESA Sentinel-2 WorldCover 10m v200 (2022)
/*
Keterangan warna: 
Biru tua    = Badan air
Biru muda   = Lahan basah
Hijau tua   = Lahan hutan atau kebun
Hijau muda  = Mangrove
Kuning      = Rumput atau semak
Merah       = Pemukiman
Ungu        = Lahan pertanian
*/
var var1 = ee.ImageCollection('ESA/WorldCover/v200').sort('CLOUD_COVER').first();
var vis1 = {bands: ['Map']};

// Memotong citra variabel (1) sesuai ROI dan menampilkannya 
var clipVar1 = var1.clip(roi).toFloat();
print('Clip Var1', clipVar1);
Map.addLayer(clipVar1, vis1, 'Var1: Jenis Tutupan Lahan',0);

// ===========>>>>> Variabel Lingkungan (2): Topografi <<<<<===========
// Data induk: JAXA ALOS DSM 30m v3.2 (2011)
// Satuan dalam 'm'
var elev = ee.ImageCollection('JAXA/ALOS/AW3D30/V3_2');
var mosaicElev = elev.mosaic();
var var2 = mosaicElev.select('DSM');
var vis2 = {
           min: 0,
           max: 3300,
};

// Memotong citra variabel (2) sesuai ROI dan menampilkannya 
var clipVar2 = var2.clip(roi).toFloat();
print('Clip Var2', clipVar2);
Map.addLayer(clipVar2, vis2, 'Var2: Topografi',0);

// ===========>>>>> Variabel Lingkungan (3): Distribusi Pemukiman Manusia <<<<<===========
// Data induk: NOAA VIIRS DNB 500m v22 (2022)
// Satuan dalam 'nanoWatts/steradian/cm^2'
var light = ee.ImageCollection('NOAA/VIIRS/DNB/ANNUAL_V22')
            .filter(ee.Filter.date('2022-01-01', '2022-12-31'));
var mosaicLight = light.mosaic();
var var3 = mosaicLight.select('maximum');
var vis3 = {
           min: 0.0, 
           max: 55.0
};

// Memotong citra variabel (3) sesuai ROI dan menampilkannya 
var clipVar3 = var3.clip(roi).toFloat();
print('Clip Var3', clipVar3);
Map.addLayer(clipVar3, vis3, 'Var3: Distribusi Pemukiman Manusia',0);

// ===========>>>>> Variabel Lingkungan (4): Kelembapan Tanah <<<<<===========
// Data induk: TerraClimate 5000m v1 (2022)
// Satuan dalam 'mm'
var sm = ee.ImageCollection('IDAHO_EPSCOR/TERRACLIMATE')
         .filter(ee.Filter.date('2022-01-01', '2022-12-31'));
var mosaicSm = sm.mosaic();
var var4 = mosaicSm.select('soil');
var vis4 = {
           min: 1000.0,
           max: 2700.0,
           palette: ['1a3678', '2955bc', '5699ff', '8dbae9', 'acd1ff', 'caebff', 'e5f9ff', 'fdffb4',
                     'ffe6a2', 'ffc969', 'ffa12d', 'ff7c1f', 'ca531a', 'ff0000', 'ab0000'],
};

// Memotong citra variabel (4) sesuai ROI dan menampilkannya 
var clipVar4 = var4.clip(roi).toFloat();
print('Clip Var4', clipVar4);
Map.addLayer(clipVar4, vis4, 'Var4: Kelembapan Tanah',0);

// ===========>>>>> Variabel Lingkungan (5): Suhu Rerata Permukaan <<<<<===========
// Data induk: Landsat 8 L1 C2 (2021)
// Satuan dalam 'derajat Celcius'
// Filtering citra Landsat 8
var temp = ee.ImageCollection("LANDSAT/LC08/C02/T1")
           .filterDate('2021-01-01', '2021-12-31').filter(ee.Filter.lt('CLOUD_COVER',10))
           .filterBounds(roi).select("B10");

// Mengolah parameter suhu citra
var first = temp.first();
var K1 = first.get('K1_CONSTANT_BAND_10');
var K2 = first.get ('K2_CONSTANT_BAND_10');
var A = first.get ('RADIANCE_ADD_BAND_10');
var M = first.get ('RADIANCE_MULT_BAND_10');
print ('Parameter A Variabel Suhu',A);
print ('Parameter M Variabel Suhu',M);
print ('Parameter K1 Variabel Suhu',K1);
print ('Parameter K2 Variabel Suhu',K2);

// Melakukan konversi nilai suhu
var var5 = temp.map(function(img){
  var id= img.id();
  // Memasukkan formula: ((K2/(log(K1/((TIR*M)+A)+1)))-273)
  return img.expression ('((1321.0789/(log(774.8853/((TIR*0.0003342)+0.1)+1)))-273)',{'TIR': img})
         .rename('B10').copyProperties (img, ['system:time_start'])});
var vis5 = {
           min: 10,
           max: 35,
           palette: ['001137', '0aab1e', 'e7eb05', 'ff4a2d', 'e90000'],
};

// Memotong citra variabel (5) sesuai ROI dan menampilkannya 
var clipVar5 = var5.mean().clip(roi).toFloat();
print('Clip Var5', clipVar5);
Map.addLayer(clipVar5, vis5, 'Var5: Suhu Permukaan Rerata',0);

// ===========>>>>> Variabel Lingkungan (6): Curah Hujan <<<<<===========
// Data induk: Climate Hazard Group Infrared Precipitation 5500m v2.0 (2023)
// Satuan dalam 'mm/pentad'
var ch = ee.ImageCollection('UCSB-CHG/CHIRPS/PENTAD')
         .filter(ee.Filter.date('2023-01-01', '2023-12-31'));
var mosaicCh = ch.mosaic();                  
var var6 = mosaicCh.select('precipitation');
var vis6 = {
           min: 0,
           max: 125,
           palette: ['LightCyan', 'LightSkyBlue', 'RoyalBlue', 'Navy'],
};

// Memotong citra variabel (6) sesuai ROI dan menampilkannya 
var clipVar6 = var6.clip(roi).toFloat();
print('Clip Var6', clipVar6);
Map.addLayer(clipVar6, vis6, 'Var6: Curah Hujan',0);

// ===========>>>>> Variabel Lingkungan (7): Tekanan Udara <<<<<===========
// Data induk: Climate Forecast System 22000m v2 (2023)
// Satuan dalam 'Pa'
var press = ee.ImageCollection('NOAA/CFSV2/FOR6H')
            .filter(ee.Filter.date('2023-01-01', '2023-12-31'));
var mosaicPress = press.mosaic();
var var7 = mosaicPress.select('Pressure_surface');
var vis7 = {
           min: 90000.0,
           max: 100000.0,
           palette: ['purple', 'blue', 'cyan', 'green', 'yellow', 'red'],
}; 

// Memotong citra variabel (7) sesuai ROI dan menampilkannya
var clipVar7 = var7.clip(roi).toFloat();
print('Clip Var7', clipVar7);
Map.addLayer(clipVar7, vis7, 'Var7: Tekanan Udara',0);

/*
<======================> Pengujian Indepedensi Antar Variabel Lingkungan <======================>
*/
// Melakukan stacking ke-7 variabel lingkungan
var newVar = ee.Image([clipVar2, clipVar3, clipVar4, clipVar5, clipVar6, clipVar7]);
var stackVar = clipVar1.addBands(newVar);
print('Stack Seluruh Variabel', stackVar
      .rename(['Var1_Land Cover', 'Var2_Topography', 'Var3_Human Distribution', 'Var4_Soil Moisture',
               'Var5_Temperature','Var6_Precipitation', 'Var7_Surface Pressure'])
               .bandNames());

// Menghitung nilai korelasi antar variabel lingkungan dengan teknik Korelasi Pearson
var DataCorr = stackVar.sample({scale: 100, region: roi, numPixels: 30, geometries: true});
var PixVal = stackVar.sampleRegions({collection: DataCorr, scale: pixSize});
var CorrAll = stackVar.bandNames().map(function(i){
    var tmp1 = stackVar.bandNames().map(function(j){
      var tmp2 = PixVal.reduceColumns({
                 reducer: ee.Reducer.pearsonsCorrelation(),
                 selectors: [i,j]
      });
      return tmp2.get('correlation');
    });
    return tmp1;
  });
print('Matriks Korelasi Variabel Lingkungan',CorrAll);

/* 
<======================> Analisis Hasil Uji Korelasi Pearson <======================>
Penelitian Miftahuddin dkk. (2021) mengkelaskan hasil nilai korelasi berdasarkan prinsip equal value
sehingga didapatkan interpretasi sebagai berikut:
1.) Korelasi SANGAT LEMAH   memiliki rentang nilai  [0,000-1,999]
2.) Korelasi LEMAH          memiliki rentang nilai  [0,200-0,399]
3.) Korelasi SEDANG         memiliki rentang nilai  [0,400-0,599]
4.) Korelasi KUAT           memiliki rentang nilai  [0,600-0,799]
5.) Korelasi SANGAT KUAT    memiliki rentang nilai  [0,800-1,000]

Variabel lingkungan yang digunakan untuk tahap lanjut pemodelan, sebaiknya tidak mengandung variabel
yang memiliki nilai korelasi KUAT dan/atau SANGAT KUAT antar variabel lainnya. Dari hasil pengujian
indepedensi variabel lingkungan menggunakan teknik Korelasi Pearson, didapatkan fakta bahwa hampir
seluruh uji korelasi antar variabel memiliki nilai yang tergolong SANGAT RENDAH, RENDAH, dan SEDANG.
Namun demikian, terdapat satu nilai hasil uji yang terklasifikasi ke dalam nilai korelasi NEGATIF KUAT,
yaitu korelasi antar variabel 2 (topografi) dengan variabel 7 (tekanan udara) dengan nilai [-0,741].

Oleh karena itu, harus dipilih salah satu antara dua variabel lingkungan yang memiliki nilai korelasi
KUAT tersebut untuk lanjut ke tahap pemodelan. Berdasarkan pertimbangan tertentu, diputuskan bahwa
variabel yang digunakan adalah variabel 2 (topografi), sedangkan variabel 7 (tekanan udara) tidak
digunakan dalam tahap lanjut pemodelan, sehingga ke-6 variabel lingkungan yang sudah resmi dinyatakan
independen dan digunakan untuk lanjut ke tahap pemodelan yaitu:
(1) jenis tutupan lahan,
(2) topografi,
(3) distribusi pemukiman manusia,
(4) kelembapan tanah,
(5) suhu rerata permukaan, dan
(6) curah hujan.
*/

// Mendefinisikan dataset dari ke-6 variabel lingkungan yang sudah ditentukan
var addVar = ['Map'/*Var1_LC*/, 'DSM'/*Var2_Topo*/, 'maximum'/*Var3_HD*/, 'soil'/*Var4_SM*/,
              'B10'/*Var5_Temp*/, 'precipitation'/*Var6_Prec*/];
var finalVar = stackVar.select(addVar).toFloat();

/*
<======================> Penghapusan Data Duplikat <======================>
*/     
// Mendefinisikan resolusi spasial dalam satuan meter
var pixSize = 5500; // >>>>> Tergantung resolusi cira terendah untuk pemodelan

// Menghapus data yang redundan (titik yang berjumlah >1 dalam 1 piksel)
function RemoveDuplicates(data){
  var randomraster = ee.Image.random().reproject('EPSG:4326', null, pixSize);
  var randompointvalue = randomraster.sampleRegions({collection:ee.FeatureCollection(data),
                         geometries: true});
  return randompointvalue.distinct('random');
}
var occurrenceRem = RemoveDuplicates(dataOccurrence).filter(ee.Filter.bounds(roi));
var absenceRem = RemoveDuplicates(dataAbsence).filter(ee.Filter.bounds(roi));

// Mengecek hasil data yang sudah dibersihkan
print("Jumlah Titik Occurrence Ori",ee.FeatureCollection(dataOccurrence).size());
print("Jumlah Titik Occurrence Filter",occurrenceRem.size());
print("Jumlah Titik Absence Ori",ee.FeatureCollection(dataAbsence).size());
print("Jumlah Titik Absence Filter",absenceRem.size());

/*
<======================> Penyiapan Environment untuk Proses Pemodelan <======================>
*/               
// Mendefinisikan grid-grid berdasarkan ekstrak nilai Lintang dan Bujur
function makeGrid(geometry, scale) {
  var lonLat = ee.Image.pixelLonLat();
  var lonGrid = lonLat
                .select('longitude')
                .multiply(111000)
                .toInt();
  var latGrid = lonLat
                .select('latitude')
                .multiply(111000)
                .toInt();
  return lonGrid
    .multiply(latGrid).reduceToVectors({
      geometry: geometry,
      scale: scale,
      geometryType: 'polygon',
    });
}

// Membuat grid untuk proses pemodelan serta menampilkannya
var scaleCross = 5500;
var grid = makeGrid(roi, scaleCross);
Map.addLayer(grid,{},'Grid untuk Pemodelan',0);

// Mendefiniskan fungsi untuk membuat nilai 'bibit' dengan angka acak antara 1-1000 guna proses iterasi
function runif(length) {
    return Array.apply(null, Array(length)).map(function() {
      return Math.round(Math.random() * (1000 - 1) + 1)});
}

// Mendefinisikan proporsi antara data training dan data testing serta jumlah iterasi
var split = 0.700; // >>>>> Training data : testing data = 70% : 30%
var numiter = 10;  // >>>>> Jumlah iterasi pemodelan = 10 kali

/*
<======================> Pemodelan Probabilitas Kesesuaian Habitat Merak Hijau <======================>
*/ 
// Mendefinisikan fungsi Species Distribution Model (SDM)
function SDM(x) {
    var seedRaw = ee.Number(x);
    // Membagi grid secara acak untuk proses training dan testing
    var block = ee.FeatureCollection(grid).randomColumn({seed:seedRaw}).sort('random');
    var TrainingGrid = block.filter(ee.Filter.lt('random', split));
    var TestingGrid = block.filter(ee.Filter.gte('random', split));
    
    // Mendefinisikan data occurrence spesies
    var occ = occurrenceRem.map(function(feature){return feature.set('occAbs',1)});
    var occPointsTR = occ.filter(ee.Filter.bounds(TrainingGrid));
    var occPointsTE = occ.filter(ee.Filter.bounds(TestingGrid));

    // Mendefinisikan data absence spesies
    var abs = absenceRem.map(function(feature){return feature.set('occAbs',0)});
    var absPointsTR = abs.filter(ee.Filter.bounds(TrainingGrid));  
    var absPointsTE = abs.filter(ee.Filter.bounds(TestingGrid));

    // Menggabungkan dataset occurrence-absence untuk data training dan data testing
    var trainingPartition = occPointsTR.merge(absPointsTR);
    var testingPartition = occPointsTE.merge(absPointsTE);
    
    // Mengekstrak nilai dari variabel lingkungan pada titik data training
    var trainPixVal = finalVar.sampleRegions({collection: trainingPartition, 
                      properties: ['occAbs'], scale: pixSize});

    // Mendefinisikan teknik pemodelan dengan algoritma Maximum Entropy (MaxEnt)
    var classifier = ee.Classifier.amnhMaxent({seed: seedRaw});
    var classifierPr = classifier.setOutputMode('probability').train(trainPixVal, 'occAbs', addVar); 
    var classifiedImgPr = finalVar.select(addVar).classify(classifierPr);
    var classProb = classifiedImgPr.select('probability');
    //return ee.List([classifierPr,classifiedImgPr,trainingPartition,testingPartition]); //[1]
    return ee.List([classProb,trainingPartition,testingPartition]); //[2]
}

/*
>>>>>>>>>>> KETERANGAN TAMBAHAN <<<<<<<<<<<
Berlaku mulai baris 330 s.d. 350
Bila setelah baris kode terdapat komen:
//[1] >>>>> Artinya baris diaktifkan ketika running pertama
//[2] >>>>> Artinya baris diaktifkan ketika running kedua
*/

// [1] Mengambil nilai vektor sebanyak jumlah iterasi yang ditetapkan
//var seedGet = runif(numiter); //[1]
//var results = ee.List(seedGet).map(SDM); //[1]

// [2] Menuliskan nilai 'bibit' tiap iterasi untuk proses running kedua
// >>>>> Nilai 'bibit' ini digunakan untuk pemodelan sebanyak jumlah iterasinya <<<<<
var results = ee.List([341,707,219,444,922,874,522,622,158,95]).map(SDM); //[2]
var results = results.flatten();
//print('Seed SDM', results); //[1]

// Mengekstrak semua daftar hasil pemodelan
var prob = ee.List.sequence(0,ee.Number(numiter).multiply(3).subtract(1),3).map(function(x){
  return results.get(x)});

/*
<======================> Visualisasi Probabilitas Kesesuaian Habitat Merak Hijau <======================>
*/ 
// Membuat parameter untuk visualisasi hasil pemodelan kesesuaian habitat
// Nilai minimum berdasarkan nilai kuartil bawah
// Nilai maksimum berdasarkan nilai kuartil atas
var visParam = {
               min: 0.366,
               max: 0.650,
               palette: ["#404788FF","#33638DFF","#287D8EFF","#1F968BFF","#29AF7FFF",
                         "#55C667FF","#95D840FF","#DCE319FF"],
};

// Memvisualisasikan seluruh hasil pemodelan kesesuaian habitat sesuai jumlah iterasi 
Map.addLayer(ee.Image(prob.get(0)), visParam, 'Iterasi 1', 0);
Map.addLayer(ee.Image(prob.get(1)), visParam, 'Iterasi 2', 0);
Map.addLayer(ee.Image(prob.get(2)), visParam, 'Iterasi 3', 0);
Map.addLayer(ee.Image(prob.get(3)), visParam, 'Iterasi 4', 0);
Map.addLayer(ee.Image(prob.get(4)), visParam, 'Iterasi 5', 0);
Map.addLayer(ee.Image(prob.get(5)), visParam, 'Iterasi 6', 0);
Map.addLayer(ee.Image(prob.get(6)), visParam, 'Iterasi 7', 0);
Map.addLayer(ee.Image(prob.get(7)), visParam, 'Iterasi 8', 0);
Map.addLayer(ee.Image(prob.get(8)), visParam, 'Iterasi 9', 0);
Map.addLayer(ee.Image(prob.get(9)), visParam, 'Iterasi 10', 0);

// Menghitung nilai rerata pemodelan dari seluruh iterasi dan menampilkannya 
var probMean = ee.ImageCollection.fromImages(prob).mean();
Map.addLayer(probMean, visParam, 'Peta Probabilitas Kesesuaian Habitat Merak Hijau');

/*
<======================> Perhitungan Nilai Kuartil Hasil Pemodelan <======================>
*/
// >>>>> Nilai ini digunakan untuk dasar penentuan threshold visualisasi <<<<<
// Nilai kuartil bawah untuk nilai minimal visualisasi
var lowQua = probMean.reduceRegion({
             reducer: ee.Reducer.percentile([25]),
             geometry: roi.geometry(),
             scale: 5500
});
print('Nilai Kuartil Bawah', lowQua);

// Nilai kuartil atas untuk nilai maksimal visualisasi
var highQua = probMean.reduceRegion({
              reducer: ee.Reducer.percentile([75]),
              geometry: roi.geometry(),
              scale: 5500
});
print('Nilai Kuartil Atas', highQua);

/*
<======================> Pembuatan Peta Indikatif Kesesuaian Habitat Merak Hijau <======================>
*/ 
// Menghitung nilai indikasi habitat potensial secara biner dan menampilkannya 
// Ambang batas merupakan nilai optimal threshold yang dihasilkan dari pada proses evaluasi
var pot = probMean.expression(
          'prob<=0.556?0:1',{
          'prob': probMean.select('probability')
          });
var potFinal = pot.clip(roi);
Map.addLayer(potFinal, {palette: ["#404788FF","#DCE319FF"]},
               'Peta Indikatif Kesesuaian Habitat Merak Hijau');

// Memvisualisasikan data lokasi kehadiran dan ketidakhadiran spesies
Map.addLayer(dataOccurrence, {color:'Aqua'}, 'Data Kehadiran Spesies');
Map.addLayer(dataAbsence, {color:'Crimson'}, 'Data Ketidakhadiran Spesies');
// Tampilan data ini opsional

/*
<======================> Evaluasi Hasil Akhir Pemodelan <======================>
*/ 
// Mengekstrak data untuk proses evaluasi
var testData = ee.List.sequence(2,ee.Number(numiter).multiply(3).subtract(1),3).map(function(x){
  return results.get(x)});

// Mengecek jumlah data untuk evaluasi hasil pemodelan
print('Jumlah Data untuk Validasi Model',
  ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(function(x){
    return ee.List([ee.FeatureCollection(testData.get(x)).filter(ee.Filter.eq('occAbs',1)).size(),
      ee.FeatureCollection(testData.get(x)).filter(ee.Filter.eq('occAbs',0)).size()]);
}));

// Mendefinisikan fungsi untuk mengestimasi nilai Sensitivity dan Specificity
function getAcc(imgTest,TP){
  var probVal = imgTest.sampleRegions({collection: TP, properties: ['occAbs'], scale: pixSize});
  var seq = ee.List.sequence({start: 0, end: 1, count: 10});
  return ee.FeatureCollection(seq.map(function(cutoff) {
  var occVal = probVal.filterMetadata('occAbs','equals',1);
  
  // Mendefinisikan true-positive (TP) dan true-positive rate (TPR)  
  var TP =  ee.Number(occVal.filterMetadata('probability','greater_than',cutoff).size());
  var TPR = TP.divide(occVal.size()); // >>>>> Disebut sebagai Sensitivity / Recall / Sensitivitas
  var absVal = probVal.filterMetadata('occAbs','equals',0);
  
  // Mendefinisikan false-negative (FN)
  var FN = ee.Number(occVal.filterMetadata('probability','less_than',cutoff).size());
  
  // Mendefinisikan true-negative (TN) dan true-negative rate (TNR) 
  var TN = ee.Number(absVal.filterMetadata('probability','less_than',cutoff).size());
  var TNR = TN.divide(absVal.size()); // >>>>> Disebut sebagai Specificity / Ketegasan
  
  // Mendefinisikan false-positive (FP) dan false-positive rate (FPR)
  var FP = ee.Number(absVal.filterMetadata('probability','greater_than',cutoff).size());
  var FPR = FP.divide(absVal.size());
  
  // Menjumlahkan nilai Sensitivity (sensitivitas) dan Specificity (ketegasan)
  var sumSS = TPR.add(TNR);
  
  // Menghitung nilai akurasi keseluruhan (Overall Accuracy)
  // Memasukkan formula: ((TN + TP) / (TN + TP + FN + FP))
  var abOa = TP.add(TN);
  var blOa = TP.add(TN).add(FP).add(FN);
  var ovAcc = abOa.divide(blOa);
  return ee.Feature(null,{cutoff: cutoff, TP:TP, TN:TN, FP:FP, FN:FN, TPR:TPR, TNR:TNR, FPR:FPR,
                          ovAcc:ovAcc, sumSS:sumSS});
  }));
}

// Membuat fungsi untuk menghitung nilai Sensitivity dan Specificity
function getSS(x){
  var suit2 = ee.Image(prob.get(x));
  var testSet2 = ee.FeatureCollection(testData.get(x));
  var acc2 = getAcc(suit2, testSet2);
  return acc2.sort({property:'sumSS',ascending:false}).first();
}

// Menampilkan seluruh hasil nilai Sensitivity dan Specificity
var sensSpec = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(getSS);
var sens = ee.FeatureCollection(sensSpec).aggregate_array("TPR");
var spec = ee.FeatureCollection(sensSpec).aggregate_array("TNR");
print('Nilai Sensitivity:', sens);
print('Nilai Specificity:', spec);

// Menampilkan rerata nilai Sensitivity dan Specificity
var meanSens = sens.reduce(ee.Reducer.mean());
print('Nilai Rerata Sensitivity:', meanSens);
var meanSpec = spec.reduce(ee.Reducer.mean());
print('Nilai Rerata Specificity:', meanSpec);

// Menampilkan nilai ambang batas indikasi habitat
var threshold = ee.Number(ee.FeatureCollection(sensSpec).aggregate_array("cutoff")
                     .reduce(ee.Reducer.max()));
print('Nilai Threshold:', threshold);

// Mendefinisikan fungsi daftar komponen untuk menghitung nilai AUC-ROC
// >>>>> Area Under the ROC (Receiver Operating Characteristic) Curve <<<<<
function getAUCROC(x){
  var X = ee.Array(x.aggregate_array('FPR'));
  var Y = ee.Array(x.aggregate_array('TPR')); 
  var X1 = X.slice(0,1).subtract(X.slice(0,0,-1));
  var Y1 = Y.slice(0,1).add(Y.slice(0,0,-1));
  return X1.multiply(Y1).multiply(0.5).reduce('sum',[0]).abs().toList().get(0);
}

// Mendefinisikan fungsi untuk menghitung nilai AUC-ROC
function AUCROCaccuracy(x){
  var suit = ee.Image(prob.get(x));
  var testSet = ee.FeatureCollection(testData.get(x));
  var acc = getAcc(suit, testSet);
  return getAUCROC(acc);
}

// Menampilkan hasil nilai AUC-ROC
var AUCROC = ee.List.sequence(0,ee.Number(numiter).subtract(1),1).map(AUCROCaccuracy);
print('Nilai AUC-ROC:', AUCROC);
var meanAUCROC = AUCROC.reduce(ee.Reducer.mean());
print('Nilai Rerata AUC-ROC:', meanAUCROC);

// Menampilkan hasil nilai akurasi keseluruhan (Overall Accuracy) 
var overalAccuracy = ee.Number(ee.FeatureCollection(sensSpec).aggregate_array("ovAcc")
                     .reduce(ee.Reducer.mean()));
print('Overall Accuracy:', overalAccuracy);

// Mengunduh hasil akhir kesesuaian habitat
Export.image.toDrive({
  image: probMean.toFloat(),
  description: 'Kesesuaian Habitat Merak Hijau',
  scale: 100,
  region: roi,
  maxPixels: 1E11
});


/* 
<======================> Analisis Hasil Evaluasi Luaran Akhir <======================>
United States Geological Survey (USGS) menyarankan nilai akurasi minimal hasil klasifikasi atau pemodelan
menggunakan data penginderaan jauh sebaiknya >=85,00%. Karena nilai akurasi keseluruhan hasil pemodelan
pada penelitian ini mencapai angka 87,73%; maka hasil luaran ini bisa dianggap 'baik' dan juga dapat
dianggap memenuhi batas minimal nilai akurasi yang telah disarankan oleh USGS sehingga hasil akhir dari
penelitian ini dapat 'diterima'. Selain itu, nilai luasan AUC-ROC yang merupakan representasi dari
ketepatan diagnosis pemodelan juga mendapatkan hasil yang baik pula, yaitu bernilai 0.934 sehingga
berdasarkan pengkelasan Zhu dkk. (2010) terhadap nilai AUC-ROC, luaran hasil pemodelan ini dapat
terklasifikasikan ke dalam kelas 'Excellent'.
*/