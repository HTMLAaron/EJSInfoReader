const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const fs = require('fs');
const formidable = require('formidable');
const ExifImage = require('exif').ExifImage;
let url = require('url');
let timestamp = null;

app.set('view engine', 'ejs');


app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname +  '/public'));

const setCurrentTimestamp = (req, res, next) => {
	timestamp = new Date().toISOString();
	console.log(`Incoming request ${req.method}, ${req.url} received at ${timestamp}`);
	next();
}

app.get('/', setCurrentTimestamp, (req,res) => {
    console.log('Home');
    res.status(200).render('home');	
    res.end();	
});



app.get('/fileupload', (req,res) => {
    console.log('No file!');
    
    res.status(500).render('nofile',{error: "No file!"});
    res.end();
    
});


app.post('/fileupload', (req,res) => {
    console.log('Handling file....');
    const form = new formidable.IncomingForm();
    form.parse(req, (err, fields, files) => {
        
        if (files.filetoupload.size == 0) {
            console.log('No file!');
            res.status(500).render('nofile',{error: "No file!"}); 
            res.end();
        }
        else {            
            let mimetype = "image/jpeg";
            let title=" ";
            let description=" ";
            if (fields.title && fields.title.length > 0) {
            title = fields.title;
              }
            if (fields.description && fields.description.length > 0) {
                description = fields.description;
            }
            if (files.filetoupload.type) {
                mimetype = files.filetoupload.type;
                console.log(mimetype);
            }
           
            if (mimetype!="image/jpeg"){
                if (mimetype=="image/gif" || mimetype=="image/png"){
                    console.log("Unsuppport image type!");
                    res.status(500).render('nofile',{error:"The given image is not a JPEG and thus unsupported right now."});
                    res.end();
                }
                else {    
                    console.log("Upload file is not image!");
                    res.status(500).render('nofile',{error: "Upload file is not image!"}); 
                    res.end();
                }
            } 
            else {    
                fs.readFile(files.filetoupload.path, (err,data) => {
            
                     image = new Buffer.from(data).toString('base64');
                
                     let ImageType = {};
                     ImageType['Image-Type'] = mimetype;
                     console.log('Preparing to send ' + JSON.stringify(ImageType));
                     //console.log(typeof title);
                     //console.log(typeof description); 
                     //console.log(typeof data);          
                    
                     new ExifImage({ image : data }, function (error, exifData) {
                         if (error)
                            console.log('Error: '+error.message);
                        else
                            //console.log("exif"); 
                            //console.log(exifData['image']['Make']); 
                            //console.log(exifData); 
                            console.log("ExifData retrieved."); 
                            try {
                                //console.log(typeof exifData['gps']['GPSLatitudeRef']);
                                //console.log(typeof exifData['gps']['GPSLatitude'][0]);                 

                                let latitude = ConvertDMSToDD(exifData['gps']['GPSLatitude'],exifData['gps']['GPSLatitudeRef']);
                                let longitude = ConvertDMSToDD(exifData['gps']['GPSLongitude'],exifData['gps']['GPSLongitudeRef']);
                                let zoom = 12;
                                
                                res.status(200).render('fileupload', {t: title, d: description, i: image, make:exifData['image']['Make'],model:exifData['image']['Model'], modifydate:exifData['exif']['CreateDate'], lat:latitude, lon:longitude, zoom:zoom});
                                res.end();
                            } catch (error) {
                                console.log("No Exif segment found in the given image.");
                                
                                res.status(500).render('nofile',{error: "No Exif segment found in the given image."}); 
                                res.end();
                            }
                            console.log("Displaying image....");
                    });
                })
            }
        }
    });

    
});



app.get('/map/:lat/:lon/:zoom', (req,res) => {
    console.log('Preparing map....'); 
    res.status(200);    
    res.render("map.ejs", {
		lat:req.params.lat,
		lon:req.params.lon,
		zoom:req.params.zoom ? req.params.zoom : 15
	});
    res.end();
});

function ConvertDMSToDD(dataA,dataB) { 
    let dd = dataA[0] + dataA[1]/60 + dataA[2]/(60*60);
    if (dataB == "S" || dataB == "W") {
        dd = dd * -1;
    }
    return dd;
}

app.listen(process.env.PORT || 8099);