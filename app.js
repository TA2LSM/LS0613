const express = require('express');
const fs = require('fs');

// app adında ve express'in tüm özelliklerine sahip bir değişken tanımladık
const app = express();

//middleware. request ile response arasında birşeyler yapılacak
app.use(express.json());

//genelde iki parametre kullanılır. ilki "req", ikincisi "res". üçüncü bir parametre kullanıldığında
//ismi ne olursa olsun bu middleware tanımladığımız anlamına geliyor. Standart olması ve anlaşılması
//için request(req), response(res), element(el), (next) gibi isimler kullanılıyor.
// GLOBAL MIDDLEWARE
app.use((req, res, next) => {
  console.log('Hello from the middleware :)');
  next(); //eğer bu kullanılmazsa uygulama çakılır (o noktada kalır). Middleware kullanılırsa next() mutlaka olacak
});

app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

const tours = JSON.parse(
  fs.readFileSync(`${__dirname}/dev-data/data/tours-simple.json`)
);

const getAllTours = (req, res) => {
  console.log(req.requestTime);

  res.status(200).json({
    status: 'success', //success, fail, error
    requestedAt: req.requestTime,
    results: tours.length, //json standardında bu alan genelde olmaz ama client tarafında işe yarayabilir diye yollanıyor
    data: {
      //tours: tours, //ES6'de aynı isimlileri yazmaya gerek yok ama standart olarak yazılabilir.
      tours,
    },
  });
};

const getTour = (req, res) => {
  //console.log(req.params);

  const id = req.params.id * 1; //string to number işlemi. Burada çoklu parametre olsaydı (x ve y) .x ve .y ile erişecektik
  //const id = Number(req.params);

  //tours dizisinin tüm elemanlarını tek tek "el" içine alır. el.id'si id'ye eşitse o öğeyi döner. Yoksa undefined döner
  const tour = tours.find((el) => el.id === id);

  // burada bu şekilde kullanmak çok sorun değil. Gerçek bir uygulama yapmıyoruz...
  //if (id > tours.length) {
  if (!tour) {
    return res.status(404).json({
      status: 'fail',
      message: 'invaid ID',
    });
  }

  res.status(200).json({
    status: 'success', //success, fail, error
    // results: tours.length, //json standardında bu alan genelde olmaz ama client tarafında işe yarayabilir diye yollanıyor
    data: {
      tour,
    },
  });
};

//create a new tour (client to server)
const createTour = (req, res) => {
  //console.log(req.body); //middleware'den gelen özellik. Tepeden kpatılırsa "undefined" olarak log'lanır

  const newId = tours[tours.length - 1].id + 1; //tours[8].id alınıp 1 fazlası newId'ye atandı
  const newTour = Object.assign({ id: newId }, req.body); //req.body alınıp içine { id: newId } keyi eklendi

  tours.push(newTour); //newTour tours içine eklendi (push)
  // event loop içinde olduğumuzdan sync versiyon kullanmayacağız. Sadece yukarda top level kodda kullandık
  fs.writeFile(
    `${__dirname}/dev-data/data/tours-simple.json`,
    JSON.stringify(tours),
    (err) => {
      // 200 kodu "ok", 201 kodu "created", 404 "not found" demek
      res.status(201).json({
        status: 'success',
        data: {
          tour: newTour,
        },
      });
    }
  );

  // sadece tek response dönebilir. yukarıda json ile dönüldüğü için bunu yazamayız.
  // aslında önce burası işleyecek çünkü writeFile fonksiyonu async olarak kullanıldığından
  // orayı beklemeden geçecek buraya gelecek.
  //res.send('Done!');
};

// Update Tour
const updateTour = (req, res) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'invaid ID',
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      tour: '<Updated tour here...>',
    },
  });
};

// Delete Tour
const deleteTour = (req, res) => {
  if (req.params.id * 1 > tours.length) {
    return res.status(404).json({
      status: 'fail',
      message: 'invaid ID',
    });
  }

  // 204 kodu "no content" demek
  res.status(204).json({
    status: 'success',
    data: null,
  });
};

//app.get('/api/v1/tours', getAllTours);
//app.post('/api/v1/tours', createTour);
app.route('/api/v1/tours').get(getAllTours).post(createTour);

/* *************************************************************** */
// Eğer bu middleware'i yukarıya değil de buraya koyarsak çalışmayacaktır. Çünkü yukarıdaki getAllTours ve createTour
// gibi fonksiyonlar içerisinde request-response cycle çoktan tamamlanmış oluyor ve middleware araya giremiyor.
// İşte bu yüzden middleware tanımlanacak yer kod içinde ve kod işleyişinde çok ÖNEMLİ !!!

// Node.js'te event cycle sürekli dönse bile bir sonraki istek gelene kadar, kod her defasında bir kere işleyip biteceği
// için neyi nereye ve nasıl yazdığın çok önemli olabiliyor.

// Buna rağmen yukarıdakiler hariç aşağıdaki gibi bir istek gelirse (getTour, updateTour, deleteTour) işte o zaman
// middleware buraya yazılsa da çalışacaktır. Temel olarak req ve res arasında örneğin getTour işlevi çalışırken
// middleware araya girip işlem yapacak ve getTour devam edecektir. Sonunda da getTour res.send() ile req-res
// cycle'ı sonlandıracaktır.

// app.use((req, res, next) => {
//   console.log('Hello from the middleware :)');
//   next(); //eğer bu kullanılmazsa uygulama çakılır (o noktada kalır). Middleware kullanılırsa next() mutlaka olacak
// });
/* *************************************************************** */

//app.get('/api/v1/tours/:id', getTour);
//app.patch('/api/v1/tours/:id', updateTour);
//app.delete('/api/v1/tours/:id', deleteTour);
app
  .route('/api/v1/tours/:id')
  .get(getTour)
  .patch(updateTour)
  .delete(deleteTour);

// kodu düzenleyip daha kolay anlaşılır hale getirdik. yukarıdaki erişim önceki ile tıpa tıp aynı işi yapacak

const port = 3000;
app.listen(port, () => {
  console.log(`App running on port ${port}...`); //buradaki tırnak işaretleri Alt Gr ile basılan ;'den geliyor
});
