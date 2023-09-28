const express = require('express');
const cookieParser = require('cookie-parser');
const mysql = require('mysql2');
const { v4: uuidv4 } = require('uuid'); // Import the uuid library
const multer = require('multer'); // Import multer
const path = require('path'); // Import path module
const fs = require('fs'); // Import fs module
const bcrypt = require("bcryptjs");
const dotenv = require("dotenv");
dotenv.config({ path: "./.env" });

// ... (other imports and app setup)

// Define storage for uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'public', 'cal', 'img');
    fs.mkdirSync(uploadPath, { recursive: true }); // Create the 'uploads' directory if it doesn't exist
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const timestamp = Date.now(); // Get the current Unix timestamp
    const fileExtension = path.extname(file.originalname); // Get the file extension
    const uniqueFilename = `${timestamp}${fileExtension}`; // Create a unique filename
    cb(null, uniqueFilename);
  },
});

// Create a multer instance with the storage options
const upload = multer({ storage });


const app = express();
const port = process.env.PORT || 3000;

// Create a MySQL connection pool for your application database
const db = mysql.createPool({
  host: process.env.db_host,
  user: process.env.db_user,
  password: process.env.db_password,
  database: process.env.db_database,
});

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.json());
app.set('view engine', 'ejs');

// Routes
app.get('/cal/', (req, res) => {
  res.render('login');
});

app.get('/cal/signup', (req, res) => {
  res.render('signup');
});

app.get('/cal/dashboard', (req, res) => {
  const sessionID = req.cookies.session_id;
  
  if (sessionID) {
    // Check if the session ID exists in the user table
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [sessionID, 'Active'],
      (err, results) => {
        if (err) {
          console.error(err);
          res.redirect('/cal/');
        } else if (results.length === 1) {
          res.render('index');
        } else {
          res.redirect('/cal/');
        }
      }
    );
  } else {
    res.redirect('/cal/');
  }
});

app.get('/cal/accounts', (req, res) => {
  res.render('accounts');
});

app.get('/cal/logout', (req, res) => {
  const sessionID = req.cookies.session_id;
  // Clear the session ID in the user table
  db.query(
    "UPDATE sessions SET status = ? WHERE session_id = ? ",
    [sessionID, 'disabled'],
    (err) => {
      if (err) {
        console.error(err);
      }
      // Clear the session ID cookie
      res.clearCookie('session_id');
      res.redirect('/cal/');
    }
  );
});




app.post('/cal/login', (req, res) => {
  const sessionID = req.cookies.session_id;
  if (sessionID) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [sessionID, 'Active'],
      (err, results) => {
        if (err) {
          console.error(err);
        } else if (results.length === 1) {
          res.send('Pass');
        }
      }
    );
  } else {
    const { username, password } = req.body;
    db.query(
      "SELECT password FROM users WHERE username = ? AND status = ?",
      [username, 'Active'],
      (err, results) => {
        console.log(results)
       
        bcrypt.compare( password, results[0].password,
          function (err, isMatch) {
            if (err) {
              throw err;
            } else if (!isMatch) {
              res.send("Incorrect username or password!");
              // console.log("fail")
            } else {
              const sessionID = uuidv4(); 
                db.query(
                    "INSERT INTO sessions SET session_id = ?, username = ?, status = ?",
                    [sessionID, username, 'Active'],
                    (err) => {
                      if (err) {
                        console.error(err);
                      } else {
                        const currentDate = new Date();
                        // Add one year
                        currentDate.setFullYear(currentDate.getFullYear() + 1);
                        // Set the session ID as a cookie with the name 'session_id' and max-age set to never expire
                        res.cookie('session_id', sessionID, { maxAge: currentDate, httpOnly: true, secure: false, sameSite: 'strict' });
                        res.cookie('username', username, { maxAge: currentDate, httpOnly: true, secure: true, sameSite: 'none' });
                        //console.log('Pass')
                        res.send('Pass');
                      }
                    }
                  );
              }
            }
        )}
        
    )}
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        
        // if (err) {
        //   console.error(err);
        //   res.redirect('/cal/');
        // } else if (results.length === 1) {
        //   const sessionID = uuidv4(); 
        //   db.query(
        //     "INSERT INTO sessions SET session_id = ?, username = ?, status = ?",
        //     [sessionID, username, 'Active'],
        //     (err) => {
        //       if (err) {
        //         console.error(err);
        //       } else {
        //         const currentDate = new Date();
        //         // Add one year
        //         currentDate.setFullYear(currentDate.getFullYear() + 1);
        //         // Set the session ID as a cookie with the name 'session_id' and max-age set to never expire
        //         res.cookie('session_id', sessionID, { maxAge: currentDate, httpOnly: true, secure: false, sameSite: 'strict' });
        //         res.cookie('username', username, { maxAge: currentDate, httpOnly: true, secure: true, sameSite: 'none' });
        //         console.log('Pass')
        //         res.send('Pass');
        //       }
        //     }
        //   );
        // } else {
        //   res.send('Pass');
        // }
      // }
    // );
  
});

app.post('/cal/register', async (req, res) => {
  const salt = await bcrypt.genSalt();
  const hashedPassword = await bcrypt.hash(req.body.password, salt);
  db.query(`SELECT username FROM users WHERE username = ?`, [req.body.username],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length > 0) {
       res.send('This email is already in use!')
      } else {
        db.query(`INSERT INTO users SET username = ?, password = ?, name = ?, phone = ?`, [req.body.username, hashedPassword, req.body.name, req.body.phone],
        (err, results) => {
          if (err) {
            console.error(err);
          } else {
            res.send("Your account has been created and pending approval!")
          }
        }
      );
      }
    }
  );

});

app.get('/cal/newusers', (req, res) => {
  const session = req.cookies.session_id;

  let datemonth = req.query.date;
  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
      (err, results) => {
        if (err) {
          console.error(err);
        } else if (results.length === 1) {
          db.query(
            `SELECT id,username,name,phone FROM users WHERE status = 'Pending'`,
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                //console.log(results);
                res.send(results);
              }
            }
          );
        }
      }
    );


  } else {
    console.log('error')
  }
});

app.post('/cal/newusers', (req, res) => {
  const session = req.cookies.session_id;
  const userid = req.body.userid;
  const status = req.body.status;
  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
      (err, results) => {
        if (err) {
          console.error(err);
        } else if (results.length === 1) {
          console.log(userid)
          console.log(status)
          db.query(
            `UPDATE users SET status = ? WHERE id = ?`,
            [status ,userid],
            (err, results) => {
              //console.log(results);
              res.send(results);
            }
          );
        }
      }
    );


  } else {
    console.log('error')
  }
});



app.get('/cal/dates', (req, res) => {
  const session = req.cookies.session_id;

  let datemonth = req.query.date;
  if(session) {
    db.query(
    "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
    [session, 'Active'],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length === 1) {
        db.query(
          `SELECT id, name, date, image, 'Birthday' AS source_table
          FROM birthday
          WHERE MONTHNAME(date) = ?
          UNION ALL
          SELECT id, name, date, image, 'Anniversary' AS source_table
          FROM anniversary
          WHERE MONTHNAME(date) = ?
          UNION ALL
          SELECT id, name, date, image, 'Died' AS source_table
          FROM death
          WHERE MONTHNAME(date) = ?
          ORDER BY DAY(date);`,
          [datemonth, datemonth, datemonth],
          (err, results) => {
            if (err) {
              console.error(err);
            } else if (results.length > 0) {
              //console.log(results);
              res.send(results);
            }
          }
        );
      }
    }
  );

    if(datemonth == "All") {
      db.query(
        "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
        [session, 'Active'],
        (err, results) => {
          if (err) {
            console.error(err);
          } else if (results.length === 1) {
            db.query(
              `SELECT id, name, date, image, 'Birthday' AS source_table
              FROM birthday
              UNION ALL
              SELECT id, name, date, image, 'Anniversary' AS source_table
              FROM anniversary
              UNION ALL
              SELECT id, name, date, image, 'Died' AS source_table
              FROM death
              ORDER BY Month(date);`,
              (err, results) => {
                if (err) {
                  console.error(err);
                } else if (results.length > 0) {
                  console.log(results);
                  res.send(results);
                }
              }
            );
          }
        }
      );
    }











  } else {
    console.log('error')
  }
});

app.post('/cal/dates', (req, res) => {
  const session = req.cookies.session_id;
  let type = req.body.type;
  let date = req.body.date;
  let name = req.body.name;
  let image = req.body.image;
  console.log(req.body)
  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length === 1) {


        if(type == 'anniversary') {
              db.query(`INSERT INTO anniversary SET name = ? , date = ? , image = ?`, [ name, date, image],
              (err, results) => {
                if (err) {
                  console.error(err);
                } else {
                 
                  res.send('saved');
                }
              }
            );
          }


          if(type == 'birthday') {
            db.query(`INSERT INTO birthday SET name = ? , date = ? , image = ?`, [name, date, image],
            (err, results) => {
              if (err) {
                console.error(err);
              } else {
                
                res.send('saved');
              }
            }
          );
        }




        if(type == 'death') {
          db.query(`INSERT INTO death SET name = ? , date = ? , image = ?`, [name, date, image],
          (err, results) => {
            if (err) {
              console.error(err);
            } else {
              
              res.send('saved');
            }
          }
        );
      }
      }
    }
  );
  } else {
    res.send("Error")
  }
});

app.put('/cal/dates', (req, res) => {
  const session = req.cookies.session_id;
  let type = req.body.type
  let id = req.body.id
  let name = req.body.name

  let date = req.body.date
  let image = req.body.image
  

  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length === 1) {
          
          if(type == 'anniversary') {
            db.query(`UPDATE anniversary SET name = ? , date = ? , image = ? WHERE id = ?`, [ name, date, image, id],
            (err, results) => {
              if (err) {
                console.error(err);
              } else {
                res.send('saved');
              }
            }
          );
        }

        if(type == 'birthday') {
          db.query(`UPDATE birthday SET name = ? , date = ? , image = ? WHERE id = ?`, [name, date, image, id],
          (err, results) => {
            if (err) {
              console.error(err);
            } else {
              res.send('saved');
            }
          }
        );
      }

      if(type == 'death') {
        db.query(`UPDATE death SET name = ? , date = ? , image = ? WHERE id = ?`, [name, date, image, id],
        (err, results) => {
          if (err) {
            console.error(err);
          } else {
            res.send('saved');
          }
        }
      );
    }
        
    }
    }
    )}
  })

app.get('/cal/event', (req, res) => {
  console.log("Yes")
  const session = req.cookies.session_id;
  let calType = req.query.type
  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length === 1) {
      
        if(calType == 'anniversary') {
          db.query(
            `SELECT id, name FROM anniversary ORDER BY name ASC`,
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }

        if(calType == 'birthday') {
          db.query(
            `SELECT id, name FROM birthday ORDER BY name ASC`,
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }

        if(calType == 'death') {
          db.query(
            `SELECT id, name FROM death ORDER BY name ASC`,
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }
      }
    }
  );
  } else {
    res.send("Error")
  }
});

app.get('/cal/person', (req, res) => {
  const session = req.cookies.session_id;
  const person = req.query.id
  let calType = req.query.type
  if(session) {
    db.query(
      "SELECT * FROM sessions WHERE session_id = ? AND status = ?",
      [session, 'Active'],
    (err, results) => {
      if (err) {
        console.error(err);
      } else if (results.length === 1) {
      
        if(calType == 'anniversary') {
          db.query(
            `SELECT * FROM anniversary WHERE id = ?`,
            [person],
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }

        if(calType == 'birthday') {
          db.query(
            `SELECT * FROM birthday WHERE id = ?`,
            [person],
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }

        if(calType == 'death') {
          db.query(
            `SELECT * FROM death WHERE id = ?`,
            [person],
            (err, results) => {
              if (err) {
                console.error(err);
              } else if (results.length > 0) {
                console.log(results);
                res.send(results);
              }
            }
          );
        }
      }
    }
  );
  } else {
    res.send("Error")
  }
});

























app.post('/cal/upload', upload.single('image'), (req, res) => {
  // If the file was successfully uploaded, req.file will contain the file details
  if (!req.file) {
    return res.status(400).send('No file uploaded.');
  }

  // You can now save the file details to your database or do any other necessary processing.

  const imagePath = `/cal/img/${req.file.filename}`;

  // Respond with a success message or redirect to another page
  res.send(`${imagePath}`);
});




app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
