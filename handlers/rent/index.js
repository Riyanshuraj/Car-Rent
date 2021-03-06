const { validationResult } = require('express-validator')
const User = require('../users/User')
const Rent = require('./Rent')
const MakeAppointment = require('../makeAppointment/MakeAppointment')

const multer = require('multer')
const path = require('path')

module.exports = {
    get: {
        myPosts(req, res, next) {
            const fullName = req.user.fullName

            let personalRentArray = {}
            let allPostRents = []

            User.findById(req.user._id).lean().then(async (userCredentials) => {
                personalRentArray = userCredentials.personalRents
                console.log('rent array', personalRentArray)

                for (let j = 0; j < personalRentArray.length; j++) {
                    await Rent.findById(personalRentArray[j]).lean().then((rent) => {
                        allPostRents.push(rent)
                    })
                }

                res.render('rent/my-posts', {
                    isLoggedIn: req.user !== undefined,
                    userEmailLogout: req.user ? req.user.email : '',
                    userInfo: req.user ? fullName : '',
                    allPostRents
                })
            })
        },

        sharedRent(req, res, next) {
            const fullName = req.user.fullName
            // console.log('FULL NAME from get rent', fullName)

            Rent.find().lean().then((rent) => {
                // console.log('RENT', rent)
                res.render('rent/shared-rent', {
                    isLoggedIn: req.user !== undefined,
                    userEmailLogout: req.user ? req.user.email : '',
                    userInfo: req.user ? fullName : '',
                    rent
                })
            })
        },

        offerRent(req, res, next) {
            const fullName = req.user.fullName

            res.render('rent/offer-rent.hbs', {
                isLoggedIn: req.user !== undefined,
                userEmailLogout: req.user ? req.user.email : '',
                userInfo: req.user ? fullName : ''
            })
        },

        offerRentEdit(req, res, next) {
            const { id } = req.params;

            Rent.findOne({ _id: id }).lean()
                .then((rent) => {
                    const fullName = req.user.fullName

                    res.render(`rent/offer-rent-edit.hbs`, {
                        isLoggedIn: req.user !== undefined,
                        userEmailLogout: req.user ? req.user.email : '',
                        userInfo: req.user ? fullName : '',
                        rent
                    })
                })
        },

        detailsRent(req, res, next) {
            const { id } = req.params
            // console.log('FULLNAME', req.user.fullName)
            // console.log('Creator user id ', id)

            Rent.findById(id).populate('makeAppointmentIds').lean().then((rent) => {

                const currentUser = JSON.stringify(req.user._id)
                // console.log('owner_id user id', currentUser)
                // console.log('rent 81 line', rent.owner_id)

                User.findById(rent.owner_id).then((userICollection) => {
                    const name = userICollection.fullName

                    res.render('rent/details-rent.hbs', {
                        isLoggedIn: req.user !== undefined,
                        // userEmail: req.user ? req.user.email : '',
                        userEmailLogout: req.user ? req.user.email : '',
                        userInfo: req.user ? req.user.fullName : '',
                        rent,
                        name,
                        //compare id of user
                        isTheOwner_id: JSON.stringify(rent.owner_id) === currentUser,
                        isAlreadyJoined: JSON.stringify(rent.makeAppointmentIds).includes(currentUser),
                        isSeatsAvailable: availableSeats > 0,
                        availableSeats
                    })
                })

                const availableSeats = 1
            })
        },

        joinRent(req, res, next) {
            const { id } = req.params
            console.log('You are in get:schedule-appointment!!!')

            Rent.findById(id).then(async (rent) => {
                let allScheduledUsersForRent = []
                console.log('rent makeAPp', rent)
                for (let i = 0; i < rent.makeAppointmentIds.length; i++) {
                    allScheduledUsersForRent.push(rent.makeAppointmentIds[i])
                }
                let allScheduledUsersForRentForTable = []

                for (let k = 0; k < allScheduledUsersForRent.length; k++) {
                    //VERY IMPORTANT , ERROR if we don't insert <lean()>
                    // Handlebars: Access has been denied to resolve the property "fullName" because it is not an "own property" of its parent.
                    // You can add a runtime option to disable the check or this warning: 
                    //The lean method of mongoose returns plain JavaScript objects (POJOs), not Mongoose documents.
                    await MakeAppointment.findById(allScheduledUsersForRent[k]).lean().then((array) => {

                        console.log('array 137', array)
                        let confirmStatus = array.confirmStatus
                        console.log('array 139', confirmStatus)

                        if (array.status === false && confirmStatus === false) {
                            array.statusResult = 'Declined'
                            array.isApproved = false
                        } else if (array.status === true && confirmStatus === true) {
                            // if()
                            array.statusResult = 'Approved'
                            array.isApproved = true
                        }
                        // console.log('array 144', array.statusResult)
                        allScheduledUsersForRentForTable.push(array)
                    })
                }
                // console.log('allScheduledUsersForRentForTable 151', allScheduledUsersForRentForTable)

                const currentUser = JSON.stringify(req.user._id)

                res.render('rent/schedule-appointment', {
                    isLoggedIn: req.user !== undefined,
                    userEmailLogout: req.user ? req.user.email : '',
                    userInfo: req.user ? req.user.fullName : '',
                    allScheduledUsersForRentForTable,
                    isTheowner: JSON.stringify(rent.owner_id) === currentUser,
                    statusResult: allScheduledUsersForRentForTable.statusResult

                })
            })
        }
    },

    post: {
        joinRent(req, res, next) {
            const { id } = req.params
            const { _id } = req.user;
            let status = false
            let confirmStatus = true
            let statusResult = ''

            const { dateStart, dateEnd, startRentTime, endRentTime } = req.body
            console.log('dateStart 162', dateStart)

            let fullName = req.user.fullName
            console.log('fullname 193', fullName)

            Promise.all([
                Rent.updateOne({ _id: id }, { $push: { enrolledCustomers: _id } }),
                User.updateOne({ _id }, { $push: { personalRents: _id } })
            ]).then((joinedUsers) => {
                // console.log('joinedUsers 169', joinedUsers)

                MakeAppointment.create({

                    dateStart, dateEnd, startRentTime, endRentTime,
                    fullName,
                    status: status,
                    confirmStatus: confirmStatus,
                    statusResult: statusResult = "Pending...",
                    enrolledCustomers: _id,
                    owner_id: id,
                })
                    .then((idFromMakeAppCollection, err) => {
                        Promise.all([
                            Rent.updateOne({ _id: id },
                                { $push: { makeAppointmentIds: idFromMakeAppCollection._id } })
                        ])
                        // MakeAppointment.findByIdAndUpdate({ _id },
                        //     { statusResult: idFromMakeAppCollection.statusResult = "Pending..." })
                        // console.log('idFromMakeAppCollection', idFromMakeAppCollection)

                        if (!err) {
                            // Rent.findById(id).then((rent) => {
                            //     res.render(`/rent/details-rent/${id}`, {
                            //         successJoin: setTimeout(() => {
                            //             "Successfully scheduled for this rent!"
                            //         }, 5000)
                            //     })
                            // }

                            //redirect accept only (status , path)
                            res.redirect(`/rent/details-rent/${id}`)

                        }
                    }).catch((err) => {

                        console.log(err)
                    })
            })

        },

        offerRent(req, res, next) {

            //Set The Storage Engine
            const storage = multer.diskStorage({
                destination: './public/uploads/',
                filename: function (req, file, cb) {
                    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
                }
            });

            // Init Upload
            const upload = multer({
                storage: storage,
                limits: { fileSize: 1000000 },
                fileFilter: function (req, file, cb) {
                    checkFileType(file, cb);
                }
            }).single('carImage');

            // Check File Type
            function checkFileType(file, cb) {
                // Allowed ext
                const filetypes = /jpeg|jpg|png|gif/;
                // Check ext
                const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
                // Check mime
                const mimetype = filetypes.test(file.mimetype);

                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb('Error: Images Only!');
                }
            }

            const { _id } = req.user;

            const errors = validationResult(req)
            console.log("ERROR", errors)

            if (!errors.isEmpty()) {
                res.render('rent/offer-rent.hbs', {
                    isLoggedIn: req.user !== undefined,
                    userInfo: req.user ? req.user.email : '',
                    message: errors.array()[0].msg,
                    oldInputForRent: {
                        vehicleType, brand, model, constructionYear, fuelType,
                        carImage, seats, price
                    }
                })

                return
            }

            upload(req, res, (err) => {

                let { vehicleType, brand, model, constructionYear, fuelType,
                    carImage, seats, price } = req.body

                let oldInputInformationAboutCarSpecifications = {}
                oldInputInformationAboutCarSpecifications.vehicleType = vehicleType
                oldInputInformationAboutCarSpecifications.brand = brand
                oldInputInformationAboutCarSpecifications.model = model
                oldInputInformationAboutCarSpecifications.constructionYear = constructionYear
                oldInputInformationAboutCarSpecifications.fuelType = fuelType
                oldInputInformationAboutCarSpecifications.carImage = carImage
                oldInputInformationAboutCarSpecifications.seats = seats
                oldInputInformationAboutCarSpecifications.price = price

                if (err) {
                    res.render('rent/offer-rent.hbs', {
                        isLoggedIn: req.user !== undefined,
                        userEmailLogout: req.user ? req.user.email : '',
                        userInfo: req.user ? req.user.fullName : '',
                        message: err,
                        oldInputForRent: {
                            vehicleType, brand, model, constructionYear, fuelType,
                            carImage, seats, price
                        }
                    });
                } else {
                    if (req.file == undefined) {
                        res.render('rent/offer-rent.hbs', {
                            message: 'Error: No File Selected(image is required)!',
                            isLoggedIn: req.user !== undefined,
                            userEmailLogout: req.user ? req.user.email : '',
                            userInfo: req.user ? req.user.fullName : '',
                            oldInputInformationAboutCarSpecifications: {
                                vehicleType, brand, model, constructionYear, fuelType,
                                carImage, seats, price
                            },
                        });
                    } else {


                        Rent.create({
                            message: 'File Uploaded!',
                            carImage: `../../uploads/${req.file.filename}`,

                            vehicleType,
                            brand,
                            model,
                            constructionYear,
                            fuelType,
                            seats,
                            price,
                            oldInputInformationAboutCarSpecifications: {
                                vehicleType, brand, model, constructionYear, fuelType,
                                carImage, seats, price
                            },

                            owner_id: _id,

                        }).then((createdTripp) => {
                            console.log('createTripp', createdTripp)
                            Promise.all([
                                User.updateOne({ _id }, { $push: { personalRents: createdTripp._id } })
                            ])
                            res.redirect('/rent/shared-rent')
                        }).catch((err) => {
                            console.log(err)
                        })
                    }
                }
            })

        },

        //Edit functionality
        offerRentEdit(req, res, next) {
            // Set The Storage Engine
            const storage = multer.diskStorage({
                destination: './public/uploads_edit/',
                filename: function (req, file, cb) {
                    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
                }
            });

            // Init Upload
            const upload = multer({
                storage: storage,
                limits: { fileSize: 1000000 },
                fileFilter: function (req, file, cb) {
                    checkFileType(file, cb);
                }
            }).single('carImage');

            // Check File Type
            function checkFileType(file, cb) {
                // Allowed ext
                const filetypes = /jpeg|jpg|png|gif/;
                // Check ext
                const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
                // Check mime
                const mimetype = filetypes.test(file.mimetype);

                if (mimetype && extname) {
                    return cb(null, true);
                } else {
                    cb('Error: Images Only!');
                }
            }

            const errors = validationResult(req)
            console.log("ERROR", errors)

            if (!errors.isEmpty()) {
                res.render(`rent/offer-rent-edit/${id}.hbs`, {
                    isLoggedIn: req.user !== undefined,
                    userEmail: req.user ? req.user.email : '',
                    message: errors.array()[0].msg
                })

                return
            }

            upload(req, res, (err) => {
                let { vehicleType, brand, model, constructionYear, fuelType,
                    carImage, seats, price } = req.body

                // const testReq = req;
                // console.log("owner_id ID line 357", testReq)
                const id = req.params.id;
                // console.log("Creator user id", id)

                const { _id } = req.user._id;
                // console.log('owner_id id user', _id)

                if (err) {
                    res.render(`/rent/offer-rent-edit.hbs/${id}`, {
                        message: err,
                        oldInputForRent: {
                            vehicleType, brand, model, constructionYear, fuelType,
                            carImage, seats, price
                        }
                    });
                } else {
                    if (req.file == undefined) {
                        res.render(`/rent/offer-rent-edit.hbs/${id}`, {
                            message: 'Error: No File Selected(image is required)!',
                            oldInputForRent: {
                                vehicleType, brand, model, constructionYear, fuelType,
                                carImage, seats, price
                            }
                        });
                    } else {

                        Rent.findByIdAndUpdate(id, {
                            message: 'File Uploaded!',
                            carImage: `../../uploads_edit/${req.file.filename}`,

                            vehicleType,
                            brand,
                            model,
                            constructionYear,
                            fuelType,
                            seats,
                            price,
                            oldInputInformationAboutCarSpecifications: {
                                vehicleType, brand, model, constructionYear, fuelType,
                                carImage, seats, price
                            },
                            owner_id: _id
                        }).then((createdTripp) => {
                            res.redirect(`/rent/details-rent/${id}`)
                        }).catch((err) => {
                            console.log(err)
                        })
                    }
                }
            })
        }
    },


    put: {
        async approved(req, res, next) {
            const { id } = req.params
            const { _id } = req.user;

            try {
                await MakeAppointment.findById(id).updateOne(
                    { $set: { status: true, confirmStatus: true } })
                    .lean()
                    .then((updateStatus) => {
                        // console.log('updateStatus from approved 114 line', updateStatus)
                    })
            } catch (error) {
                console.error("465 line fail for APPROVED command");
            }

            await MakeAppointment.findById(id).lean().then((makeAppEntities) => {
                const rentId = makeAppEntities.owner_id
                res.redirect(`/rent/schedule-appointment/${rentId}`)
            })
        },

        async declined(req, res, next) {
            const { id } = req.params
            const { _id } = req.user;
            console.log('makeAppointments collection id 470', id)
            console.log('rent collection owner_id 471', _id)

            try {
                await MakeAppointment.findById(id).updateOne({ $set: { status: false, confirmStatus: false } }).lean().then((updateStatus) => {
                    console.log('updateStatus from declined 475', updateStatus)
                })
            } catch (error) {
                console.error("476 line fail for DECLINED command");
            }

            await MakeAppointment.findById(id).lean().then((makeAppEntities) => {
                const rentId = makeAppEntities.owner_id
                res.redirect(`/rent/schedule-appointment/${rentId}`)
            })
        },
    },

    delete: {
        closeRent(req, res, next) {
            const { id } = req.params
            Rent.deleteOne({ _id: id }).then((deleteRent) => {
                res.redirect('/rent/shared-rent')
            })
        },
    }
}