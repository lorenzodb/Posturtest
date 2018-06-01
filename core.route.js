// Copyright 2014-2015 Alex Benfaremo, Alessandro Chelli, Lorenzo Di Berardino, Matteo Di Sabatino

/** ******************************* LICENSE **********************************
 *                                                                          *
 * This file is part of ApioOS.                                             *
 *                                                                          *
 * ApioOS is free software released under the GPLv2 license: you can        *
 * redistribute it and/or modify it under the terms of the GNU General      *
 * Public License version 2 as published by the Free Software Foundation.   *
 *                                                                          *
 * ApioOS is distributed in the hope that it will be useful, but            *
 * WITHOUT ANY WARRANTY; without even the implied warranty of               *
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the             *
 * GNU General Public License version 2 for more details.                   *
 *                                                                          *
 * To read the license either open the file COPYING.txt or                  *
 * visit <http://www.gnu.org/licenses/gpl2.txt>                             *
 *                                                                          *
 ****************************************************************************/

// var Nightmare = require("nightmare");
var arp = require('arp')
var async = require('async')
var exec = require('child_process').exec
var fs = require('fs-extra')
var request = require('request')
var formidable = require('formidable')
var validator = require('validator')
var fetch = require('node-fetch')

var appRoot = require('app-root-path')
var PDFDocument = require('pdfkit')
module.exports = function (Apio) {
  return {
    generateAndSendPDF: function (req, res) {
      var appPath = appRoot.path + '/public/applications/' + req.body.objectId + '/PDF'
      var urlPath = '/applications/' + req.body.objectId + '/PDF/'
      var pdfName = req.body.pdfName || 'scheda_cliente.pdf'

      console.log('req.body.data: ', req.body.data)

      var offset = req.body.data.length
      var arraySeries = req.body.data.map(function (x, index) {
        var pageName = 'page' + index + '_' + new Date().toISOString() + '.png'
        return function (callback) {
          fs.writeFile(appPath + '/data.json', JSON.stringify(x, null, 4), function (err) {
            if (err) {
              console.log('Error while creating file ' + appPath + '/data.json: ', err)
              callback(err)
            } else {
              // exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + (x.renderer || 'report.html') + ' ' + appPath + '/' + pageName + ' 3108px*2688px', function (error) {
              exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + (x.renderer || 'report.html') + ' ' + appPath + '/' + pageName + ' 1480px*2600px', function (error) {
                if (error) {
                  callback(error)
                } else {
                  callback(null, pageName)
                }
              })
            }
          })
        }
      })

      Array.prototype.push.apply(arraySeries, req.body.data[0].mattresses.reduce(function (acc, x, index) {
        var mappedIndex = Math.floor(index / 2)
        if (!(acc[mappedIndex] instanceof Array)) {
          acc[mappedIndex] = []
        }

        acc[mappedIndex].push(x)
        return acc
      }, []).map(function (json, index) {
        var pageName = 'page' + (index + offset) + '_' + new Date().toISOString() + '.png'
        return function (callback) {
          fs.writeFile(appPath + '/data.json', JSON.stringify(json, null, 4), function (err) {
            if (err) {
              console.log('Error while creating file ' + appPath + '/data.json: ', err)
              callback(err)
            } else {
              console.log('json: ', JSON.stringify(json, null, 4))
              exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + 'final_page.html ' + appPath + '/' + pageName + ' 1480px*2600px', function (error) {
                if (error) {
                  callback(error)
                } else {
                  callback(null, pageName)
                }
              })
            }
          })
        }
      }))

      async.series(arraySeries, function (err, results) {
        if (err) {
          console.log('Async error: ', err)
          res.status(500).send(err)
        } else {
          console.log('results: ', results)
          // Generating PDF with the created images
          fs.unlink(appPath + '/' + pdfName, function () {
            var doc = new PDFDocument({ layout: 'landscape', size: [2600, 1480] })
            doc.pipe(fs.createWriteStream(appPath + '/' + pdfName))
            results.forEach(function (img, index, ref_array) {
              console.log('Adding image ' + appPath + '/' + img)
              doc.image(appPath + '/' + img, 0, 0)
              if (index !== ref_array.length - 1) {
                doc.addPage({ layout: 'landscape', size: [2600, 1480] })
              }
            })

            doc.end()

            results.forEach(function (img) {
              fs.unlink(appPath + '/' + img, function (err) {
                if (err) {
                  console.log('Error while unlinking file ' + appPath + '/' + img + ': ', err)
                } else {
                  console.log('File ' + appPath + '/' + img + ' successfully unlinked')
                }
              })
            })

            fs.unlink(appPath + '/data.json', function (err) {
              if (err) {
                console.log('Error while unlinking file ' + appPath + '/data.json: ', err)
              } else {
                console.log('File ' + appPath + '/data.json successfully unlinked')
              }
            })

            res.sendStatus(200)
          })
        }
      })
    },



    // generateAndSendPDF: function (req, res) {
    //   var appPath = appRoot.path + '/public/applications/' + req.body.objectId + '/PDF'
    //   var urlPath = '/applications/' + req.body.objectId + '/PDF/'
    //   var pdfName = req.body.pdfName || 'scheda_cliente.pdf'

    //   console.log('req.body.data: ', req.body.data)

    //   var arraySeries = [
    //     function (callback) {
    //       var pageName = 'page0_' + new Date().toISOString() + '.png'
    //       fs.writeFile(appPath + '/data.json', JSON.stringify(req.body.data[0], null, 4), function (err) {
    //         if (err) {
    //           console.log('Error while creating file ' + appPath + '/data.json: ', err)
    //           callback(err)
    //         } else {
    //           // exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + (req.body.data[0].renderer || 'report.html') + ' ' + appPath + '/' + pageName + ' 3108px*2688px', function (error) {
    //           exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + (req.body.data[0].renderer || 'report.html') + ' ' + appPath + '/' + pageName + ' 1480px*2600px', function (error) {
    //             if (error) {
    //               callback(error)
    //             } else {
    //               callback(null, pageName)
    //             }
    //           })
    //         }
    //       })
    //     }
    //   ]

    //   Array.prototype.push.apply(arraySeries, req.body.data[0].mattresses.reduce(function (acc, x, index) {
    //     var mappedIndex = Math.floor(index / 2)
    //     if (!(acc[mappedIndex] instanceof Array)) {
    //       acc[mappedIndex] = []
    //     }

    //     acc[mappedIndex].push(x)
    //     return acc
    //   }, []).map(function (json, index) {
    //     var pageName = 'page' + (index + 1) + '_' + new Date().toISOString() + '.png'
    //     return function (callback) {
    //       fs.writeFile(appPath + '/data.json', JSON.stringify(json, null, 4), function (err) {
    //         if (err) {
    //           console.log('Error while creating file ' + appPath + '/data.json: ', err)
    //           callback(err)
    //         } else {
    //           console.log('json: ', JSON.stringify(json, null, 4))
    //           exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + 'final_page.html ' + appPath + '/' + pageName + ' 1480px*2600px', function (error) {
    //             if (error) {
    //               callback(error)
    //             } else {
    //               callback(null, pageName)
    //             }
    //           })
    //         }
    //       })
    //     }
    //   }))

    //   async.series(arraySeries, function (err, results) {
    //     if (err) {
    //       console.log('Async error: ', err)
    //       res.status(500).send(err)
    //     } else {
    //       console.log('results: ', results)
    //       // Generating PDF with the created images
    //       fs.unlink(appPath + '/' + pdfName, function () {
    //         var doc = new PDFDocument({ layout: 'landscape', size: [2600, 1480] })
    //         doc.pipe(fs.createWriteStream(appPath + '/' + pdfName))
    //         results.forEach(function (img, index, ref_array) {
    //           console.log('Adding image ' + appPath + '/' + img)
    //           doc.image(appPath + '/' + img, 0, 0)
    //           if (index !== ref_array.length - 1) {
    //             doc.addPage({ layout: 'landscape', size: [2600, 1480] })
    //           }
    //         })

    //         doc.end()

    //         results.forEach(function (img) {
    //           fs.unlink(appPath + '/' + img, function (err) {
    //             if (err) {
    //               console.log('Error while unlinking file ' + appPath + '/' + img + ': ', err)
    //             } else {
    //               console.log('File ' + appPath + '/' + img + ' successfully unlinked')
    //             }
    //           })
    //         })

    //         fs.unlink(appPath + '/data.json', function (err) {
    //           if (err) {
    //             console.log('Error while unlinking file ' + appPath + '/data.json: ', err)
    //           } else {
    //             console.log('File ' + appPath + '/data.json successfully unlinked')
    //           }
    //         })

    //         res.sendStatus(200)
    //       })
    //     }
    //   })
    // },



    // generateAndSendPDF: function (req, res) {
    //   var appPath = appRoot.path + '/public/applications/' + req.body.objectId + '/PDF'
    //   // var urlPath = "/applications/" + req.body.objectId + "/PDF/report.html";
    //   var urlPath = '/applications/' + req.body.objectId + '/PDF/'
    //   var pdfName = req.body.pdfName || 'scheda_cliente.pdf'

    //   async.series(req.body.data.map(function (json, index) {
    //     var pageName = 'page' + index + '_' + new Date().toISOString() + '.png'
    //     return function (callback) {
    //       fs.writeFile(appPath + '/data.json', JSON.stringify(json, null, 4), function (err) {
    //         if (err) {
    //           console.log('Error while creating file ' + appPath + '/data.json: ', err)
    //           callback(err)
    //         } else {
    //           // exec("phantomjs " + appRoot.path + "/createPDF.js http://localhost:" + Apio.Configuration.http.port + urlPath + " " + appPath + "/" + pageName + " 1422px*730px", function (error) {

    //           exec('phantomjs ' + appRoot.path + '/createPDF.js http://localhost:' + Apio.Configuration.http.port + urlPath + (json.renderer || 'report.html') + ' ' + appPath + '/' + pageName + ' 1422px*730px', function (error) {
    //             if (error) {
    //               callback(error)
    //             } else {
    //               callback(null, pageName)
    //             }
    //           })
    //         }
    //       })
    //     }
    //   }),
    //   function (err, results) {
    //     if (err) {
    //       console.log('Async error: ', err)
    //       res.status(500).send(err)
    //     } else {
    //       console.log('results: ', results)
    //       // Generating PDF with the created images
    //       fs.unlink(appPath + '/' + pdfName, function () {
    //         // var doc = new PDFDocument({layout: "landscape", size: [768, 1280]});
    //         var doc = new PDFDocument({ layout: 'landscape', size: [730, 1422] })
    //         doc.pipe(fs.createWriteStream(appPath + '/' + pdfName))
    //         results.forEach(function (img, index, ref_array) {
    //           console.log('Adding image ' + appPath + '/' + img)
    //           doc.image(appPath + '/' + img, 0, 0)
    //           if (index !== ref_array.length - 1) {
    //             // doc.addPage({layout: "landscape", size: [768, 1280]});
    //             doc.addPage({ layout: 'landscape', size: [730, 1422] })
    //           }
    //         })

    //         doc.end()

    //         results.forEach(function (img) {
    //           fs.unlink(appPath + '/' + img, function (err) {
    //             if (err) {
    //               console.log('Error while unlinking file ' + appPath + '/' + img + ': ', err)
    //             } else {
    //               console.log('File ' + appPath + '/' + img + ' successfully unlinked')
    //             }
    //           })
    //         })

    //         /* fs.unlink(appPath + "/data.json", function (err) {
    //           if (err) {
    //           console.log("Error while unlinking file " + appPath + "/data.json: ", err);
    //           } else {
    //           console.log("File " + appPath + "/data.json successfully unlinked");
    //           }
    //           });
    //           */

    //         res.sendStatus(200)
    //       })
    //     }
    //   })
    // },
    getSysInfo: function (req, res) {
      if (Apio.Configuration.type === 'cloud') {
        var socketId = Apio.connectedSockets[req.session.apioId]
        if (Apio.io.sockets.connected.hasOwnProperty(socketId)) {
          Apio.io.sockets.connected[socketId].emit('ask_sys_info')
          req.pause()

          var fn = function (data) {
            if (data.apioId === req.session.apioId) {
              req.resume()
              res.status(200).send(data.status)
              Apio.io.sockets.connected[socketId].removeListener('get_sys_info', fn)
            }
          }

          req.on('close', function () {
            Apio.io.sockets.connected[socketId].removeListener('get_sys_info', fn)
            res.status(500).send('Connection timeout')
          })

          req.on('end', function () {
            Apio.io.sockets.connected[socketId].removeListener('get_sys_info', fn)
            res.status(500).send('Connection timeout')
          })

          req.on('timeout', function () {
            Apio.io.sockets.connected[socketId].removeListener('get_sys_info', fn)
            res.status(500).send('Connection timeout')
          })

          req.on('error', function () {
            Apio.io.sockets.connected[socketId].removeListener('get_sys_info', fn)
            res.status(500).send('Connection timeout')
          })

          Apio.io.sockets.connected[socketId].on('get_sys_info', fn)
        } else {
          res.status(500).send('Board not connected')
        }
      } else if (Apio.Configuration.type === 'gateway') {
        var addMeasurementUnit = function (order) {
          var measurement = ''
          order = Number(order)
          if (order === 0) {
            measurement = 'kB'
          } else if (order === 1) {
            measurement = 'MB'
          } else if (order === 2) {
            measurement = 'GB'
          } else if (order === 3) {
            measurement = 'TB'
          } else if (order === 4) {
            measurement = 'PB'
          } else if (order === 5) {
            measurement = 'EB'
          } else if (order === 6) {
            measurement = 'ZB'
          } else if (order === 7) {
            measurement = 'YB'
          }

          return measurement
        }

        async.series([function (callback) {
          exec("cat /proc/stat | grep 'cpu' | tail -n 4", function (error, stdout, stderr) {
            if (error || stderr) {
              callback(error || stderr)
            } else if (stdout) {
              stdout = stdout.split('\n')
              stdout.pop()

              var obj = {}

              for (var r = 0; r < stdout.length; r++) {
                var stdoutComponents = stdout[r].split(' ')
                var idle = Number(stdoutComponents[4]) + Number(stdoutComponents[5])
                var total = 0
                for (var c = 1; c < stdoutComponents.length - 2; c++) {
                  total += Number(stdoutComponents[c])
                }

                obj[stdoutComponents[0]] = {
                  unit: '%',
                  value: (((total - idle) / total) * 100).toFixed(1)
                }
              }

              callback(null, obj)
            }
          })
        }, function (callback) {
          exec("free -k | awk '{print $3}'", function (error, stdout, stderr) {
            if (error || stderr) {
              callback(error || stderr)
            } else if (stdout) {
              stdout = stdout.split('\n')
              stdout.pop()
              var RAMmemInkB = Number(stdout[2].trim())
              var swapMemInkB = Number(stdout[3].trim())

              for (var i = 0; RAMmemInkB >= 1024; i++) {
                RAMmemInkB /= 1024
              }

              for (var j = 0; swapMemInkB >= 1024; j++) {
                swapMemInkB /= 1024
              }

              callback(null, {
                ram: { unit: addMeasurementUnit(i), value: RAMmemInkB },
                swap: { unit: addMeasurementUnit(j), value: swapMemInkB }
              })
            }
          })
        }, function (callback) {
          exec("free -k | awk '{print $2}'", function (error, stdout, stderr) {
            if (error || stderr) {
              callback(error || stderr)
            } else if (stdout) {
              stdout = stdout.split('\n')
              stdout.pop()
              var RAMmemInkB = Number(stdout[1].trim())
              var swapMemInkB = Number(stdout[3].trim())

              for (var i = 0; RAMmemInkB >= 1024; i++) {
                RAMmemInkB /= 1024
              }

              for (var j = 0; swapMemInkB >= 1024; j++) {
                swapMemInkB /= 1024
              }

              callback(null, {
                ram: { unit: addMeasurementUnit(i), value: RAMmemInkB },
                swap: { unit: addMeasurementUnit(j), value: swapMemInkB }
              })
            }
          })
        }, function (callback) {
          exec('for id in core sdram_c sdram_i sdram_p ; do echo -e "$id:$(vcgencmd measure_volts $id)" ; done', function (error, stdout, stderr) {
            if (error || stderr) {
              callback(error || stderr)
            } else if (stdout) {
              stdout = stdout.replace(/-e /g, '')
              stdout = stdout.split('\n')
              stdout.pop()
              var obj = {}
              for (var x in stdout) {
                var temp = stdout[x].split(':')
                var tempVal = temp[1].split('=')
                var temp_ = tempVal[1].trim()
                var indexOfUnit = temp_.indexOf('V')
                var unit = temp_.slice(indexOfUnit)
                var value = temp_.split(unit)[0]
                obj[temp[0].trim()] = { unit: unit, value: value }
              }
              callback(null, obj)
            }
          })
        }, function (callback) {
          exec('vcgencmd measure_temp', function (error, stdout, stderr) {
            if (error || stderr) {
              callback(error || stderr)
            } else if (stdout) {
              stdout = stdout.split('=')[1].trim()
              stdout = stdout.replace("'", '°')
              var indexOfUnit = stdout.indexOf('°')
              var unit = stdout.slice(indexOfUnit)
              var value = stdout.split(unit)[0]
              callback(null, { core: { unit: unit, value: value } })
            }
          })
        }], function (err, results) {
          if (err) {
            res.status(500).send(err)
          } else if (results) {
            res.status(200).send({
              CPU: results[0],
              RAM: {
                percentage: {
                  unit: '%',
                  value: (100 * Number(results[1].ram.value) / Number(results[2].ram.value)).toFixed(1)
                },
                total: { unit: results[2].ram.unit, value: results[2].ram.value.toFixed(1) },
                used: { unit: results[2].ram.unit, value: results[1].ram.value.toFixed(1) }
              },
              Swap: {
                percentage: {
                  unit: '%',
                  value: (100 * Number(results[1].swap.value) / Number(results[2].swap.value)).toFixed(1)
                },
                total: { unit: results[2].swap.unit, value: results[2].swap.value.toFixed(1) },
                used: { unit: results[2].swap.unit, value: results[1].swap.value.toFixed(1) }
              },
              Temperature: results[4],
              Voltage: results[3]
            })
          }
        })
      }
    },
    manageDriveFile: function (req, res) {
      // in case of request from to cloud
      console.log('********* REQ manageDriveFile *********')
      var url = undefined
      var newPath = ''
      var oldPath = ''
      var imageName = ''
      var imageType = ''
      url = 'public/users/' + req.session.email + '/temp'
      console.log('URL FOMRIDABLE ', 'public/users/' + req.session.email + '/temp')
      fs.mkdirs(url, function (err_m1) {
        if (err_m1) {
          res.status(500).send(true)
        } else {
          res.setHeader('Content-Type', 'application/json')
          var form = new formidable.IncomingForm()
          form.uploadDir = url
          form.keepExtensions = true

          form.parse(req, function (err, fields, files) {
            console.log('file uploaded: ', files)
            console.log('fields uploaded: ', fields)
            if (err) {
              res.status(500).send(true)
            } else {
              newPath = 'public/' + fields.uploadPath
              oldPath = files.file.path
              imageName = fields.imageName

              var tmpType = files.file.type.split('/')
              imageType = tmpType[1]
            }
          })

          form.on('file', function (name, file) {
            console.log('END UPLOAD FILE ', name, file)
          })

          form.on('end', function () {
            console.log('END UPLOAD')
            console.log(oldPath)
            console.log(newPath)
            fs.mkdirs(newPath, function (err_m2) {
              if (err_m2) {
                res.status(500).send(true)
              } else {
                fs.stat(newPath + '/' + imageName + '.' + imageType, function (err_s, stats) {
                  var final = function () {
                    fs.rename(oldPath, newPath + '/' + imageName + '.' + imageType, function (err_r) {
                      if (err_r) {
                        res.status(500).send(true)
                      } else {
                        fs.stat(oldPath, function (err_s2, stats2) {
                          if (err_s2) {
                            res.status(200).send(true)
                          } else if (stats2) {
                            fs.unlink(oldPath, function (err_u2) {
                              if (err_u2) {
                                res.status(500).send(true)
                              } else {
                                res.status(200).send(true)
                              }
                            })
                          }
                        })
                      }
                    })
                  }

                  if (err_s) {
                    final()
                  } else if (stats) {
                    fs.unlink(newPath + '/' + imageName + '.' + imageType, function (err) {
                      if (err) {
                        res.status(500).send(true)
                      } else {
                        final()
                      }
                    })
                  }
                })
              }
            })
          })
        }
      })
    },
    getBindToProperty: function (req, res) {
      Apio.Database.db.collection('Communication').findOne({ name: 'addressBindToProperty' }, function (error, obj) {
        if (error) {
          res.status(500).send(error)
        } else if (obj) {
          delete obj._id
          delete obj.name
          res.status(200).send(obj)
        } else {
          res.sendStatus(404)
        }
      })
    },
    modifyBindToProperty: function (req, res) {
      Apio.Database.db.collection('Communication').findOne({ name: 'addressBindToProperty' }, function (error, obj) {
        if (error) {
          res.status(500).send(error)
        } else if (obj) {
          delete obj._id
          var keys = Object.keys(obj)
          var bodyKeys = Object.keys(req.body)
          // Creating a unique object with both the keys of the old and the new object
          for (var k in bodyKeys) {
            if (keys.indexOf(bodyKeys[k]) === -1) {
              keys.push(bodyKeys[k])
            }
          }

          for (var k in keys) {
            if (keys[k] !== 'name') {
              if (!req.body.hasOwnProperty(keys[k])) {
                // If the new object hasn't got the property it has been removed, so also in the final object it have to be removed
                delete obj[keys[k]]
              } else {
                // If the new object contains the property it is the same or it has been modified, so in the final object it have to be overwritten
                obj[keys[k]] = req.body[keys[k]]
              }
            }
          }

          Apio.Database.db.collection('Communication').update({ name: 'addressBindToProperty' }, obj, function (err, result) {
            if (err) {
              res.status(500).send(err)
            } else {
              res.sendStatus(200)
            }
          })
        } else {
          res.sendStatus(404)
        }
      })
    },
    getIntegrated: function (req, res) {
      Apio.Database.db.collection('Communication').findOne({ name: 'integratedCommunication' }, function (error, obj) {
        if (error) {
          res.status(500).send(error)
        } else if (obj) {
          delete obj._id
          delete obj.name
          res.status(200).send(obj)
        } else {
          res.sendStatus(404)
        }
      })
    },
    modifyIntegrated: function (req, res) {
      Apio.Database.db.collection('Communication').findOne({ name: 'integratedCommunication' }, function (error, obj) {
        if (error) {
          res.status(500).send(error)
        } else if (obj) {
          delete obj._id
          var keys = Object.keys(obj)
          var bodyKeys = Object.keys(req.body)
          // Creating a unique object with both the keys of the old and the new object
          for (var k in bodyKeys) {
            if (keys.indexOf(bodyKeys[k]) === -1) {
              keys.push(bodyKeys[k])
            }
          }

          for (var k in keys) {
            if (keys[k] !== 'name') {
              if (!req.body.hasOwnProperty(keys[k])) {
                // If the new object hasn't got the property it has been removed, so also in the final object it have to be removed
                delete obj[keys[k]]
              } else {
                // If the new object contains the property it is the same or it has been modified, so in the final object it have to be overwritten
                obj[keys[k]] = req.body[keys[k]]
              }
            }
          }

          Apio.Database.db.collection('Communication').update({ name: 'integratedCommunication' }, obj, function (err, result) {
            if (err) {
              res.status(500).send(err)
            } else {
              res.sendStatus(200)
            }
          })
        } else {
          res.sendStatus(404)
        }
      })
    },
    installNgrok: function (req, res) {
      /* var nightmare = Nightmare({show: false});
        nightmare
        .goto("https://dashboard.ngrok.com/user/signup")
        .type("form[action*='/user/signup'] [name=name]", req.session.email)
        .type("form[action*='/user/signup'] [name=email]", req.session.email)
        .type("form[action*='/user/signup'] [name=confirm]", req.session.email)
        .type("form[action*='/user/signup'] [name=password]", req.session.email)
        .click("form[action*='/user/signup'] [type=submit]")
        .wait("#dashboard")
        .evaluate(function () {
        return document.querySelector(".get-started .well").firstChild.firstChild.nextSibling.innerHTML;
        })
        .end()
        .then(function (token) {
        console.log("NGROK token: ", token);
        exec("bash ./ngrok_install.sh " + token);
        var send = true;
        var interval = setInterval(function () {
        console.log("INTERVAL");
        if (send) {
        send = false;
        exec("nmap -p 4040 -Pn localhost | grep 4040 | awk '{print $2}'", function (error, stdout, stderr) {
        if (error || stderr) {
        res.status(500).send(error || stderr);
        } else if (stdout) {
        stdout = stdout.trim();
        send = true;
        if (stdout === "open") {
        send = false;
        Apio.Configuration.remoteAccess = true;
        var c = JSON.parse(JSON.stringify(Apio.Configuration));
        delete c.dongle;
        fs.writeFile("./configuration/default.js", "module.exports = " + JSON.stringify(c, undefined, 4).replace(/\"([^(\")"]+)\":/g, "$1:") + ";", function (err) {
        if (err) {
        console.log("Error while saving configuration: ", err);
        } else {
        console.log("Configuration successfully saved");
        }
        });
        exec("curl http://localhost:4040/inspect/http | grep window.common", function (error1, stdout1, stderr1) {
        clearInterval(interval);
        if (error1) {
        res.status(500).send(error1);
        } else if (stdout1) {
        var result = stdout1.split(" ");
        var index = -1;
        var obj = "";
        for (var i = 0; index === -1 && i < result.length; i++) {
        if (result[i] === "window.common") {
        index = i
        }
        }
        if (index > -1) {
        for (var i = index + 2; i < result.length; i++) {
        if (obj === "") {
        obj = result[i];
        } else {
        obj += " " + result[i];
        }
        }
        obj = eval(obj);
        var url = obj.Session.Tunnels.command_line.URL;
        url = url.split("/");
        url = url[url.length - 1];
        url = url.split(":");
        var port = url[1];
        url = url[0];
        console.log("url: ", url, "port: ", port);
        res.status(200).send("ssh pi@" + url + " -p " + port);
        } else {
        res.status(500).send("No address");
        }
        }
        });
        }
        }
        });
        }
        }, 0);
        //}).catch(function (error) {
        //    res.status(500).send(error);
       }); */
    },
    toggleEnableCloud: function (req, res) {
      Apio.Configuration.remote.enabled = !Apio.Configuration.remote.enabled
      var c = JSON.parse(JSON.stringify(Apio.Configuration))
      delete c.dongle
      // fs.writeFile("./configuration/default.js", "module.exports = " + JSON.stringify(c, undefined, 4).replace(/\"([^(\")"]+)\":/g, "$1:") + ";", function (err) {
      fs.writeFile(Apio.config.return().name, 'module.exports = ' + JSON.stringify(c, undefined, 4) + ';', function (err) {
        if (err) {
          console.log('Error while saving configuration: ', err)
          res.status(500).send(err)
        } else {
          console.log('Configuration successfully saved')
          if (Apio.Configuration.remote.enabled === true) {
            if (Apio.Remote.socket) {
              Apio.Remote.socket.connect()
              res.sendStatus(200)
            } else {
              res.status(200).send('restart')
              request.post('http://localhost:' + Apio.Configuration.http.port + '/apio/restartSystem', function (err) {
                if (err) {
                  console.log('Error while restarting system: ', err)
                  res.sendStatus(500)
                }
              })
            }
          } else if (Apio.Configuration.remote.enabled === false) {
            Apio.Remote.socket.disconnect()
            res.sendStatus(200)
          }
        }
      })
    },
    rebootBoard: function (req, res) {
      if (Apio.Configuration.type === 'cloud') {
        // Apio.io.emit("apio_reboot_board", req.session.apioId);
        var socketId = Apio.connectedSockets[req.session.apioId][0]
        Apio.io.sockets.connected[socketId].emit('apio_reboot_board')
      } else if (Apio.Configuration.type === 'gateway') {
        setTimeout(function () {
          var execReboot = function () {
            // exec("sudo reboot", function (error, stdout, stderr) {
            //     if (error || stderr) {
            //         console.log("exec error: " + error || stderr);
            //     } else if (stdout) {
            //         console.log("Board is rebooting in a while, please wait");
            //     }
            // });
            fs.writeFile('./force_sync.apio', '1', function (err) {
              if (err) {
                console.log('Error while writing force_sync.apio: ', err)
              } else {
                console.log('force_sync.apio correctly updated')
                exec('sudo reboot', function (error, stdout, stderr) {
                  if (error || stderr) {
                    console.log('exec error: ' + error || stderr)
                  } else if (stdout) {
                    console.log('Board is rebooting in a while, please wait')
                  }
                })
              }
            })
          }

          if (Apio.Configuration.sendSystemMails) {
            Apio.Database.db.collection('Services').findOne({ name: 'mail' }, function (e, service) {
              if (e) {
                console.log('Unable to find service mail: ', e)
              } else if (service) {
                Apio.Database.db.collection('Users').find({ role: 'superAdmin' }).toArray(function (e_u, users) {
                  if (e_u) {
                    console.log('Unable to find superAdmins: ', e_u)
                  } else if (users) {
                    var mail = []
                    for (var x in users) {
                      if (validator.isEmail(users[x].email)) {
                        mail.push(users[x].email)
                      }
                    }

                    var to = mail[0]
                    var cc = mail.splice(1)

                    if (to) {
                      require('dns').resolve('www.google.com', function (err) {
                        if (err) {
                          execReboot()
                        } else {
                          request.post('http://localhost:' + service.port + '/apio/mail/send', {
                            body: {
                              to: to,
                              cc: cc.join(),
                              subject: 'Board riavviata',
                              text: 'La board ' + Apio.Configuration.name + ' (apioId: ' + Apio.System.getApioIdentifier() + ') è stata riavvata il ' + (new Date())
                            },
                            json: true
                          }, function (err, httpResponse) {
                            // if (err) {
                            //     console.log("Error while sending mail: ", err);
                            // } else if (httpResponse.statusCode === 200) {
                            //     execReboot();
                            // }
                            execReboot()
                          })
                        }
                      })
                    } else {
                      execReboot()
                    }
                  }
                })
              }
            })
          } else {
            execReboot()
          }
        }, 5000)
      }
    },
    restartSystem: function (req, res) {
      if (Apio.Configuration.type === 'cloud') {
        // Apio.io.emit("apio_restart_system", req.session.apioId);
        var socketId = Apio.connectedSockets[req.session.apioId][0]
        Apio.io.sockets.connected[socketId].emit('apio_restart_system')
      } else if (Apio.Configuration.type === 'gateway') {
        exec("ps aux | grep app.js | awk '{print $2}'", function (error, appjsPID, stderr) {
          if (error) {
            console.log('exec error: ' + error)
          } else if (appjsPID) {
            appjsPID = appjsPID.split('\n')
            appjsPID.pop()
            exec('cd ' + __dirname + "/.. && forever start -s -c 'node --expose_gc' app.js", function (error, stdout, stderr) {
              if (error || stderr) {
                console.log('exec error: ' + error || stderr)
              } else {
                if (appjsPID.length > 2) {
                  for (var i in appjsPID) {
                    exec('sudo kill -9 ' + appjsPID[i], function (error, stdout, stderr) {
                      if (error) {
                        console.log('exec error: ' + error)
                      } else {
                        console.log('Process with PID ' + appjsPID[i] + ' killed')
                      }
                    })
                  }
                }
              }
            })
          }
        })
      }
    },
    shutdownBoard: function (req, res) {
      if (Apio.Configuration.type === 'cloud') {
        // Apio.io.emit("apio_shutdown_board", req.session.apioId);
        var socketId = Apio.connectedSockets[req.session.apioId][0]
        Apio.io.sockets.connected[socketId].emit('apio_shutdown_board')
        res.sendStatus(200)
      } else if (Apio.Configuration.type === 'gateway') {
        Apio.io.emit('apio_shutdown')
        setTimeout(function () {
          var execShutdown = function () {
            exec('echo 1-1 | tee /sys/bus/usb/drivers/usb/unbind', function () {
              setTimeout(function () {
                // exec("sudo shutdown -h now", function (error, stdout, stderr) {
                //     if (error || stderr) {
                //         console.log("exec error: " + error || stderr);
                //         res.sendStatus(500);
                //     } else if (stdout) {
                //         console.log("Board is shutting down in a while, please wait");
                //         res.sendStatus(200);
                //     }
                // });

                fs.writeFile('./force_sync.apio', '1', function (err) {
                  if (err) {
                    console.log('Error while writing force_sync.apio: ', err)
                  } else {
                    console.log('force_sync.apio correctly updated')
                    exec('sudo shutdown -h now', function (error, stdout, stderr) {
                      if (error || stderr) {
                        console.log('exec error: ' + error || stderr)
                      } else if (stdout) {
                        console.log('Board is shutting down in a while, please wait')
                      }
                    })
                  }
                })
              }, 1000)
            })
          }

          if (Apio.Configuration.sendSystemMails) {
            Apio.Database.db.collection('Services').findOne({ name: 'mail' }, function (e, service) {
              if (e) {
                console.log('Unable to find service mail: ', e)
              } else if (service) {
                Apio.Database.db.collection('Users').find({ role: 'superAdmin' }).toArray(function (e_u, users) {
                  if (e_u) {
                    console.log('Unable to find superAdmins: ', e_u)
                  } else if (users) {
                    var mail = []
                    for (var x in users) {
                      if (validator.isEmail(users[x].email)) {
                        mail.push(users[x].email)
                      }
                    }

                    var to = mail[0]
                    var cc = mail.splice(1)

                    if (to) {
                      require('dns').resolve('www.google.com', function (err) {
                        if (err) {
                          execShutdown()
                        } else {
                          request.post('http://localhost:' + service.port + '/apio/mail/send', {
                            body: {
                              to: to,
                              cc: cc.join(),
                              subject: 'Board spenta',
                              text: 'La board ' + Apio.Configuration.name + ' (apioId: ' + Apio.System.getApioIdentifier() + ') è stata spenta il ' + (new Date())
                            },
                            json: true
                          }, function (err, httpResponse) {
                            // if (err) {
                            //     console.log("Error while sending mail: ", err);
                            // } else if (httpResponse.statusCode === 200) {
                            //     execShutdown();
                            // }
                            execShutdown()
                          })
                        }
                      })
                    } else {
                      execShutdown()
                    }
                  }
                })
              }
            })
          } else {
            execShutdown()
          }
        }, 2000)
      }
    },
    launchPropertiesAdder: function (req, res) {
      exec('cd ./services && node apio_properties_adder.js --apioId ' + req.session.apioId + (req.body.objectId ? ' --objectId ' + req.body.objectId : ''), function (error, stdout, stderr) {
        if (error || stderr) {
          res.status(500).send(error || stderr)
        } else {
          res.status(200).send(stdout)
        }
      })
    },
    getServiceByName: function (req, res) {
      Apio.Database.db.collection('Services').findOne({ name: req.params.name }, function (error, result) {
        if (error) {
          res.status(500).send(error)
        } else if (result) {
          res.status(200).send(result)
        } else {
          res.sendStatus(404)
        }
      })
    },
    getAllLogs: function (req, res) {
      var files = fs.readdirSync('public/applications/' + req.params.app)
      var toRead = []
      var toSend = {}
      for (var i in files) {
        if (files[i].indexOf('.json') > -1 && files[i].indexOf('logs') > -1) {
          toRead.push('public/applications/' + req.params.app + '/' + files[i])
        }
      }

      toRead.sort(function (a, b) {
        var aComponents = a.split(' ')[1].split('.')[0].split('-')
        aComponents[0] = Number(aComponents[0])
        aComponents[1] = Number(aComponents[1])
        aComponents[2] = Number(aComponents[2])
        var bComponents = b.split(' ')[1].split('.')[0].split('-')
        bComponents[0] = Number(bComponents[0])
        bComponents[1] = Number(bComponents[1])
        bComponents[2] = Number(bComponents[2])

        return aComponents[0] - bComponents[0] || aComponents[1] - bComponents[1] || aComponents[2] - bComponents[2]
      })

      for (var i in toRead) {
        var read = fs.readFileSync(toRead[i])
        var f = read === '' ? {} : JSON.parse(read)
        for (var j in f) {
          if (!toSend.hasOwnProperty(j)) {
            toSend[j] = {}
          }

          for (var k in f[j]) {
            toSend[j][k] = f[j][k]
          }
        }
      }

      res.status(200).send(toSend)
    },
    log: function (req, res) {
      var log_entry = {
        timestamp: Date.now(),
        source: req.body.log.source || null, // Una stringa che identifica chi ha prodotto questo log
        event: req.body.log.event || null, // Una stringa che identifica il tipo di evento
        value: req.body.log.value || null // Un valore assegnato all'evento
      }

      Apio.Logger.log(log_entry)
    },
    admin: function (req, res) {
      res.sendfile('public/html/settings.html')
    },
    monitor: function (req, res) {
      if (req.body.check === 0) {
        exec('netstat -anp 2> /dev/null | grep :' + req.body.port + " | awk '{ print $7 }' | cut -d '/' -f1", function (error, stdout, stderr) {
          if (error || stderr) {
            res.status(500).send(error || stderr)
          } else {
            res.status(200).send(stdout)
          }
        })
      } else if (req.body.check === 1) {
        exec('netstat -anp 2> /dev/null | grep :' + req.body.port + " | awk '{ print $7 }' | cut -d '/' -f1 | xargs kill", function (error, stdout, stderr) {
          if (error || stderr) {
            res.status(500).send(error || stderr)
          } else {
            res.status(200).send(stdout)
          }
        })
      } else if (req.body.check === 2) {
        exec('cd ./services && forever start -s ' + req.body.process + '.js', function (error, stdout, stderr) {
          if (error || stderr) {
            res.status(500).send(error || stderr)
          } else {
            res.status(200).send(stdout)
          }
        })
      }
    },
    setCloudAccess: function (req, res) {
      if (Apio.Configuration.remote.enabled && Apio.Configuration.type === 'gateway') {
        var user = req.body.user
        Apio.Database.db.collection('Users').findAndModify({
          'email': user.email
        }, [
          ['email', 1]
        ], {
          $set: {
            'enableCloud': req.body.cloudAccess
          }
        }, function (err, result) {
          if (err) {
            Apio.Util.log('Unable to enable the user ' + user.email + ' on the cloud due to a local database error.')
            console.log(err)
          } else {
            Apio.Util.log('The user has been locally enabled to access the cloud. Now telling ApioCloud...')
            Apio.Util.log('Contacting ApioCloud to enable user ' + user.email + ' ...')
            request.post(Apio.Configuration.remote.uri + '/apio/user/' + user.email + '/editAccess', {
              form: {
                'email': result.email,
                'password': result.password,
                'apioId': Apio.System.getApioIdentifier(),
                'grant': req.body.cloudAccess
              }
            }, function (err, httpResponse, body) {
              Apio.Util.log('ApioCloud responded with (' + body + ').')
              var response = JSON.parse(body)
              res.send(response)
            })
          }
        })
      }
    },
    adapter: function (req, res) {
      var req_data = {
        json: true,
        uri: req.body.url,
        method: 'POST',
        body: req.body.data
      }
      console.log('\n\n /apio/adapter sending the following request')
      console.log(req_data)
      console.log('\n\n')
      var _req = request(req_data, function (error, response, body) {
        if (typeof response !== 'undefined') {
          if (response.statusCode === '200' || response.statusCode === 200) {
            console.log('Apio Adapter method : got the following response from ' + req.body.url)
            console.log(body)
            res.send(body)
          } else {
            console.log('Apio Adapter : Something went wrong ')
            res.status(response.statusCode).send(body)
          }
        } else {
          res.status(500).send()
        }
      })
    },
    restore: function (req, res) {
      // var sys = require("sys");
      var exec = require('child_process').exec
      console.log('Qui')
      var child = exec('mongo apio --eval "db.dropDatabase()" && mongorestore ./data/apio -d apio', function (error, stdout, stderr) {
        // sys.print("stdout: "+stdout);
        // sys.print("stderr: "+stderr);
        if (error !== null) {
          console.log('exec error: ' + error)
        }
      })
      res.status(200).send({})
    },
    shutdown: function (req, res) {
      /* var child = exec("sudo shutdown -h now", function(error, stdout, stderr) {
        //sys.print("stdout: "+stdout);
        //sys.print("stderr: "+stderr);
        if (error !== null) {
        console.log("exec error: " + error);
        }
        }); */
      if (Apio.Configuration.type === 'cloud') {
        Apio.io.emit('apio_shutdown', req.session.apioId)
      } else if (Apio.Configuration.type === 'gateway') {
        Apio.io.emit('apio_shutdown')
      }
      res.status(200).send({})
    },
    // index: function (req, res) {
    //     //Apio.Database.db.collection("Users").findOne({
    //     //    name: "verify"
    //     //}, function (err, doc) {
    //     //    if (err) {
    //     //        var sys = require("sys");
    //     //        var exec = require("child_process").exec;
    //     //        var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio");
    //     //
    //     //
    //     //    } else {
    //     //        if (doc) {
    //     //            console.log("Il database c'è faccio il dump");
    //     //            var sys = require("sys");
    //     //            var exec = require("child_process").exec;
    //     //            var child = exec("mongodump --out ./backup");
    //     //
    //     //
    //     //        } else {
    //     //            console.log("Il database non c'è faccio il restore");
    //     //            var sys = require("sys");
    //     //            var exec = require("child_process").exec;
    //     //            if (fs.existsSync("./backup/apio")) {
    //     //                console.log("C'è il backup fs.exist");
    //     //                var child = exec("mongorestore ./backup/apio -d apio");
    //     //
    //     //            } else {
    //     //                console.log("Non c'è il backup fs.exist");
    //     //                var child = exec("mongorestore ./data/apio -d apio");
    //     //
    //     //            }
    //     //
    //     //
    //     //        }
    //     //
    //     //    }
    //     //});
    //
    //     if (Apio.Configuration.type === "cloud") {
    //         // if (req.query.hasOwnProperty("ip") && req.query.hasOwnProperty("objectId")) {
    //         //     res.redirect("http://" + req.query.ip + ":8086/#/home/" + req.query.objectId);
    //         if (req.query.hasOwnProperty("route")) {
    //             res.redirect("http://" + req.query.route);
    //         } else {
    //             if (!req.session.hasOwnProperty("email")) {
    //                 // if (Apio.Configuration.hasOwnProperty("index")) {
    //                 //     if (Apio.Configuration.index.default === false) {
    //                 //         res.sendfile("public/applications/html/index.html");
    //                 //     } else {
    //                 //         res.sendfile("public/html/index.html");
    //                 //     }
    //                 // } else {
    //                 //     res.sendfile("public/html/index.html");
    //                 // }
    //
    //                 var red = function () {
    //                     if (Apio.Configuration.hasOwnProperty("index")) {
    //                         if (Apio.Configuration.index.default === false) {
    //                             res.sendfile("public/applications/html/index.html");
    //                         } else {
    //                             res.sendfile("public/html/index.html");
    //                         }
    //                     } else {
    //                         res.sendfile("public/html/index.html");
    //                     }
    //                 };
    //
    //                 var ipCheck = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    //                 var ipExtended = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    //                 var components = ipExtended.split(":");
    //                 var ip = components[components.length - 1].trim();
    //
    //                 if (ipCheck.test(ip)) {
    //                     arp.getMAC(ip, function (err, mac) {
    //                         if (err) {
    //                             console.log("---------------------------");
    //                             console.log("err: (1)", err, "mac: ", mac);
    //                             console.log("---------------------------");
    //                             red();
    //                         } else if (mac) {
    //                             Apio.Database.db.collection("Users").findOne({mac: mac}, function (err, data) {
    //                                 if (err) {
    //                                     console.log("---------------------------");
    //                                     console.log("err: (2)", err);
    //                                     console.log("---------------------------");
    //                                     red();
    //                                 } else if (data) {
    //                                     req.session.email = data.email;
    //                                     req.session.auth = true;
    //                                     if (Apio.Configuration.type === "cloud") {
    //                                         req.session.apioId = "Continue to Cloud";
    //                                     } else if (Apio.Configuration.type === "gateway") {
    //                                         req.session.apioId = Apio.System.getApioIdentifier();
    //                                     }
    //                                     if (data.role) {
    //                                         req.session.priviligies = data.role;
    //                                     } else {
    //                                         req.session.priviligies = "error";
    //                                     }
    //
    //                                     req.session.cookie.expires = null;
    //
    //                                     req.session.token = data.token;
    //
    //                                     res.sendfile("public/html/app.html");
    //                                 } else {
    //                                     console.log("---------------------------");
    //                                     console.log("else (1)");
    //                                     console.log("---------------------------");
    //                                     red();
    //                                 }
    //                             });
    //                         } else {
    //                             console.log("---------------------------");
    //                             console.log("else (2)");
    //                             console.log("---------------------------");
    //                             red();
    //                         }
    //                     });
    //                 } else {
    //                     console.log("---------------------------");
    //                     console.log("else (3)");
    //                     console.log("---------------------------");
    //                     red();
    //                 }
    //             } else {
    //                 res.sendfile("public/html/app.html");
    //             }
    //         }
    //     } else if (Apio.Configuration.type === "gateway") {
    //         // if (!req.session.hasOwnProperty("email")) {
    //         //     if (Apio.Configuration.hasOwnProperty("index")) {
    //         //         if (Apio.Configuration.index.default === false) {
    //         //             res.sendfile("public/applications/html/index.html");
    //         //         } else {
    //         //             res.sendfile("public/html/index.html");
    //         //         }
    //         //     } else {
    //         //         res.sendfile("public/html/index.html");
    //         //     }
    //         // } else {
    //         //     res.sendfile("public/html/app.html");
    //         // }
    //
    //         if (!req.session.hasOwnProperty("email")) {
    //             var red = function () {
    //                 if (Apio.Configuration.hasOwnProperty("index")) {
    //                     if (Apio.Configuration.index.default === false) {
    //                         res.sendfile("public/applications/html/index.html");
    //                     } else {
    //                         res.sendfile("public/html/index.html");
    //                     }
    //                 } else {
    //                     res.sendfile("public/html/index.html");
    //                 }
    //             };
    //
    //             var ipCheck = /^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$/;
    //             var ipExtended = req.headers["x-forwarded-for"] || req.connection.remoteAddress;
    //             var components = ipExtended.split(":");
    //             var ip = components[components.length - 1].trim();
    //
    //             if (ipCheck.test(ip)) {
    //                 arp.getMAC(ip, function (err, mac) {
    //                     if (err) {
    //                         red();
    //                     } else if (mac) {
    //                         Apio.Database.db.collection("Users").findOne({mac: mac}, function (err, data) {
    //                             if (err) {
    //                                 red();
    //                             } else if (data) {
    //                                 req.session.email = data.email;
    //                                 req.session.auth = true;
    //                                 if (Apio.Configuration.type === "cloud") {
    //                                     req.session.apioId = "Continue to Cloud";
    //                                 } else if (Apio.Configuration.type === "gateway") {
    //                                     req.session.apioId = Apio.System.getApioIdentifier();
    //                                 }
    //                                 if (data.role) {
    //                                     req.session.priviligies = data.role;
    //                                 } else {
    //                                     req.session.priviligies = "error";
    //                                 }
    //
    //                                 req.session.cookie.expires = null;
    //
    //                                 req.session.token = data.token;
    //
    //                                 res.sendfile("public/html/app.html");
    //                             } else {
    //                                 red();
    //                             }
    //                         });
    //                     } else {
    //                         red();
    //                     }
    //                 });
    //             } else {
    //                 red();
    //             }
    //         } else {
    //             res.sendfile("public/html/app.html");
    //         }
    //     }
    // },
    index: function (req, res) {
      // Apio.Database.db.collection("Users").findOne({
      //    name: "verify"
      // }, function (err, doc) {
      //    if (err) {
      //        var sys = require("sys");
      //        var exec = require("child_process").exec;
      //        var child = exec("mongo apio --eval \"db.dropDatabase()\" && mongorestore ./data/apio -d apio");
      //
      //
      //    } else {
      //        if (doc) {
      //            console.log("Il database c'è faccio il dump");
      //            var sys = require("sys");
      //            var exec = require("child_process").exec;
      //            var child = exec("mongodump --out ./backup");
      //
      //
      //        } else {
      //            console.log("Il database non c'è faccio il restore");
      //            var sys = require("sys");
      //            var exec = require("child_process").exec;
      //            if (fs.existsSync("./backup/apio")) {
      //                console.log("C'è il backup fs.exist");
      //                var child = exec("mongorestore ./backup/apio -d apio");
      //
      //            } else {
      //                console.log("Non c'è il backup fs.exist");
      //                var child = exec("mongorestore ./data/apio -d apio");
      //
      //            }
      //
      //
      //        }
      //
      //    }
      // });

      if (Apio.Configuration.type === 'cloud') {
        // if (req.query.hasOwnProperty("ip") && req.query.hasOwnProperty("objectId")) {
        //     res.redirect("http://" + req.query.ip + ":8086/#/home/" + req.query.objectId);
        if (req.query.hasOwnProperty('route')) {
          res.redirect('http://' + req.query.route)
        } else {
          if (!req.session.hasOwnProperty('email')) {
            if (Apio.Configuration.hasOwnProperty('index')) {
              if (Apio.Configuration.index.default === false) {
                res.sendfile('public/applications/html/index.html')
              } else {
                res.sendfile('public/html/index.html')
              }
            } else {
              res.sendfile('public/html/index.html')
            }
          } else {
            res.sendfile('public/html/app.html')
          }
        }
      } else if (Apio.Configuration.type === 'gateway') {
        if (!req.session.hasOwnProperty('email')) {
          if (Apio.Configuration.hasOwnProperty('index')) {
            if (Apio.Configuration.index.default === false) {
              res.sendfile('public/applications/html/index.html')
            } else {
              res.sendfile('public/html/index.html')
            }
          } else {
            res.sendfile('public/html/index.html')
          }
        } else {
          res.sendfile('public/html/app.html')
        }
      }
    },
    login: function (req, res, n) {
      console.log('-------------------------')
      console.log('req.session: ', req.session)
      console.log('-------------------------')
      if (req.session.hasOwnProperty('email')) {
        if (typeof Apio === 'undefined') {
          Apio = {}
        }
        if (typeof Apio.user === 'undefined') {
          Apio.user = {}
        }
        if (typeof Apio.user.email === 'undefined') {
          Apio.user.email = []
        }

        if (req.session.email && Apio.user.email.indexOf(req.session.email) === -1) {
          Apio.user.email.push(req.session.email)
        }

        n()
      } else {
        console.log('Unauthorized access redirected to login screen')
        res.redirect('/')
      }
    },
    getPlatform: function (req, res) {
      var o = {}
      if (Apio.Configuration.type === 'cloud') {
        o.apioId = req.session.apioId
        o.type = 'cloud'
      } else if (Apio.Configuration.type === 'gateway') {
        o.apioId = Apio.System.getApioIdentifier()
        o.type = 'gateway'
      }
      res.status(200).send(o)
    },
    getIP: function (req, res) {
      exec('hostname -I', function (error, stdout, stderr) {
        if (error || stderr) {
          res.status(500).send()
        } else if (stdout) {
          res.status(200).send(stdout)
        } else {
          res.status(404).send()
        }
      })
    },
    getIPComplete: function (req, res) {
      exec("ifconfig -a | grep 'Link encap' | awk '{print $1}'", function (error, stdout) {
        if (error) {
          console.log('exec error (1): ', error)
        } else if (stdout) {
          var next = true
          var peripherals = stdout.split('\n')
          var peripheralsIP = {}
          peripherals.pop()
          var interval = setInterval(function () {
            if (peripherals.length) {
              if (next) {
                next = false
                var p = peripherals[0]
                if (p !== '' && p !== 'lo') {
                  exec('ifconfig ' + p.trim() + " | grep 'inet addr' | awk -F: '{print $2}' | awk '{print $1}'", function (error, stdout) {
                    if (error) {
                      console.log('exec error (2): ', error)
                    } else if (stdout) {
                      peripheralsIP[p] = stdout.trim()
                      peripherals.splice(0, 1)
                      next = true
                    } else {
                      peripherals.splice(0, 1)
                      next = true
                    }
                  })
                } else {
                  peripherals.splice(0, 1)
                  next = true
                }
              }
            } else {
              clearInterval(interval)
              exec('wget http://ipinfo.io/ip -qO -', function (error, stdout) {
                var publicIP = ''
                if (error) {
                  console.log('exec error (3): ', error)
                  // res.status(200).send({local: peripheralsIP, public: publicIP});
                } else if (stdout) {
                  publicIP = stdout.trim()
                  // res.status(200).send({local: peripheralsIP, public: publicIP});
                }

                exec('curl http://localhost:4040/inspect/http | grep window.common', function (error1, stdout1, stderr1) {
                  if (error1) {
                    console.log('exec error (4): ', error1)
                    res.status(200).send({ local: peripheralsIP, public: publicIP, remote: '' })
                  } else if (stdout1) {
                    var result = stdout1.split(' ')
                    var index = -1
                    var obj = ''
                    for (var i = 0; index === -1 && i < result.length; i++) {
                      if (result[i] === 'window.common') {
                        index = i
                      }
                    }

                    if (index > -1) {
                      for (var i = index + 2; i < result.length; i++) {
                        if (obj === '') {
                          obj = result[i]
                        } else {
                          obj += ' ' + result[i]
                        }
                      }

                      obj = eval(obj)
                      var url = obj.Session.Tunnels.command_line.URL
                      url = url.split('/')
                      url = url[url.length - 1]
                      url = url.split(':')
                      var port = url[1]
                      url = url[0]
                      res.status(200).send({
                        local: peripheralsIP,
                        public: publicIP,
                        remote: 'ssh pi@' + url + ' -p ' + port
                      })
                    } else {
                      res.status(200).send({ local: peripheralsIP, public: publicIP, remote: '' })
                    }
                  }
                })
              })
            }
          }, 0)
        }
      })
    },
    getServices: function (req, res) {
      var searchQuery = {}
      if (Apio.Configuration.type === 'cloud') {
        searchQuery.apioId = req.session.apioId
      }
      Apio.Database.db.collection('Services').find(searchQuery).toArray(function (error, result) {
        if (error) {
          res.status(500).send()
        } else if (result) {
          res.status(200).send(result)
        } else {
          res.status(404).send()
        }
      })
    },
    redirect: function (req, res) {
      console.log('Richiesta /app')
      res.sendfile('public/html/app.html')
    },
    serialSend: function (req, res) {
      var obj = req.body.data
      console.log('\n\n%%%%%%%%%%\nAl seria/send arriva questp')
      console.log(obj)
      console.log('\n%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%%\n\n')
      Apio.Serial.send(obj)
      res.send({ status: true })
    },
    getFiles: function (req, res) {
      res.status(200).send(fs.readdirSync('public/' + decodeURIComponent(req.params.folder)))
    },
    fileDelete: function (req, res) {
      if (req.body.path.indexOf('planimetry') > -1) {
        if (Apio.Configuration.type === 'cloud') {
          req.body.path = req.body.path.replace('planimetry', 'planimetry/' + req.session.apioId)
          var filename = req.body.path.split('/')
          filename = filename[filename.length - 1]
          // Apio.io.emit("apio.remove.planimetry", {
          //    apioId: req.session.apioId,
          //    filename: filename
          // });

          var socketId = Apio.connectedSockets[req.session.apioId][0]
          Apio.io.sockets.connected[socketId].emit('apio.remove.planimetry', {
            // apioId: req.session.apioId,
            filename: filename
          })
        } else if (Apio.Configuration.type === 'gateway') {
          if (Apio.Configuration.remote.enabled) {
            Apio.Remote.socket.emit('apio.remove.planimetry.fromgateway', {
              apioId: req.session.apioId,
              filename: req.body.path
            })
          }
        }
      }

      fs.unlink(req.body.path, function (err) {
        if (err) {
          console.log(err)
          res.status(400).send(false)
        } else {
          res.status(200).send(true)
        }
      })
    },
    returnConfig: function (req, res) {
      res.send(Apio.Configuration)
    },
    update: function (req, res) {
      if (Apio.Configuration.type === 'cloud') {
        if (req.session.apioId === 'Continue to Cloud') {
          res.status(200).send(false)
        } else {
          var socketId = Apio.connectedSockets[req.session.apioId]
          if (Apio.io.sockets.connected.hasOwnProperty(socketId)) {
            Apio.io.sockets.connected[socketId].emit('check_updates')
            req.pause()

            // delete Apio.io.sockets.connected[socketId]._events["board_update"];
            // Apio.io.sockets.connected[socketId].on("board_update", function (data) {
            //     req.resume();
            //     res.status(200).send(data);
            // });

            var fn = function (data) {
              if (data.apioId === req.session.apioId) {
                req.resume()
                res.status(200).send(data.status)
                Apio.io.sockets.connected[socketId].removeListener('board_update', fn)
              }
            }

            Apio.io.sockets.connected[socketId].on('board_update', fn)
          } else {
            res.status(200).send(false)
          }
        }
      } else if (Apio.Configuration.type === 'gateway') {
        fs.readFile('.git/HEAD', 'utf8', function (err, head) {
          if (err) {
            res.status(200).send(false)
          } else if (head) {
            var ref_file = head.split('ref:')[1].trim()
            var ref_file_components = ref_file.split('/')
            var version_file = undefined

            if (ref_file_components[ref_file_components.length - 1] === 'master') {
              version_file = 'version.json'
            } else {
              version_file = 'version_' + ref_file_components[ref_file_components.length - 1] + '.json'
            }

            fs.readFile('.git/' + ref_file, 'utf8', function (err_c, lastCommit) {
              if (err_c) {
                res.status(200).send(false)
              } else if (lastCommit) {
                exec('git show -s --format=%ci', function (error_g, date) {
                  if (error_g) {
                    res.status(200).send(false)
                  } else if (date) {
                    date = new Date(date)
                    console.log('date: ', date)
                    console.log('lastCommit: ', lastCommit)
                    var fetch_fn = function () {
                      require('dns').resolve('www.google.com', function (err) {
                        if (err) {
                          console.log('No internet connection, impossible to fetch')
                        } else {
                          fetch('https://raw.githubusercontent.com/ApioLab/updates/master/' + version_file).then(function (res) {
                            return res.text()
                          }).then(function (body) {
                            var remoteCommit = JSON.parse(body)
                            console.log('remoteCommit.commit: ', remoteCommit.commit)
                            remoteCommit.date = new Date(remoteCommit.apioOs)
                            console.log('remoteCommit.date: ', remoteCommit.date)
                            if (remoteCommit.commit.substring(0, 7) !== lastCommit.substring(0, 7) && date <= remoteCommit.date) {
                              res.status(200).send(true)
                            } else {
                              res.status(200).send(false)
                            }
                          }).catch(function (err) {
                            console.log('Caught error while fetching: ', err)
                            console.log('Trying to fetch again')
                            // fetch_fn();
                          })
                        }
                      })
                    }
                    fetch_fn()
                  } else {
                    res.status(200).send(false)
                  }
                })
              } else {
                res.status(200).send(false)
              }
            })
          } else {
            res.status(200).send(false)
          }
        })
      }
    }
  }
}
