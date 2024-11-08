const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const { MongoClient, ObjectId } = require('mongodb');

const PORT = 5000;

const url = 'mongodb+srv://xplora-user:FriendersTeam10!@xplora.u95ur.mongodb.net/?retryWrites=true&w=majority&appName=Xplora';
const client = new MongoClient(url);
client.connect();

app.use(cors());
app.use(bodyParser.json());
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    res.setHeader(
        'Access-Control-Allow-Methods',
        'GET, POST, PATCH, DELETE, OPTIONS, PUT'
    );
    next();
});

//Log In API
app.post('/api/login', async (req, res, next) => {
    let error = '';
    const { email, password } = req.body;

    try {
        const db = client.db('xplora');

        const results = await db.collection('users').findOne(
            { email: email, password: password }
        );

        if (results) {
            const { _id: id, first_name: firstName, last_name: lastName } = results;
            res.status(200).json({ id, firstName, lastName, error: '' });
        } else {
            error = 'Invalid login or password';
            res.status(401).json({ error });
        }
    } catch (err) {
        error = 'An error occurred while accessing the database';
        res.status(500).json({ error });
    }
});

// Register API
app.post('/api/register', async (req, res, next) => {
    let error = '';
    const { first_name, last_name, email, password } = req.body;
    console.log(`${first_name} ${last_name} ${email} ${password}`);

    try {
        const db = client.db('xplora');

        const results = await db.collection('users').findOne({ email: email });

        if (!results) {
            const newUser = {
                first_name,
                last_name,
                email,
                password,
            };

            const result = await db.collection('users').insertOne(newUser);
            const message = 'User added successfully';

            // Send the user's data along with the success message
            res.status(201).json({
                message: message,
                first_name: newUser.first_name,
                last_name: newUser.last_name,
                email: newUser.email,
            });
        } else {
            error = 'Email already exists';
            res.status(401).json({ error });
        }
    } catch (err) {
        error = 'An error occurred while accessing the database';
        res.status(500).json({ error });
    }
});

//--------------------------------
// TRIPS -- POST to add a new trip
app.post('/api/users/:userId/trips', async (req, res) => {
    const { name, city, start_date, end_date, notes, picture_url } = req.body;

    if (!name || !city || !start_date || !end_date) {
        return res.status(400).json({ error: 'All fields are required' });
    }

    const objectId = new ObjectId(String(req.params.userId));

    try {
        const db = client.db('xplora');

        const existingTrip = await db.collection('trips').findOne({
            user_id: objectId,
            name,
            city,
            start_date,
            end_date
        });

        if (existingTrip) {
            return res.status(409).json({ error: 'Trip already exists' });
        }

        const newTrip = {
            user_id: objectId,
            name,
            city,
            start_date,
            end_date,
            notes,
            picture_url,
        };

        const result = await db.collection('trips').insertOne(newTrip);

        res.status(201).json({
            message: 'Trip added successfully',
            trip_id: result.insertedId,
        });
    } catch (error) {
        console.error('Error occurred while adding trip:', error);
        res.status(500).json({ error: 'An error occurred while adding the trip' });
    }
});

//TRIPS -- GET trips from user_id
app.get('/api/users/:userId/trips', async (req, res) => {
    try {
        const user_id = req.params.userId;

        const db = client.db('xplora');
        const objectId = new ObjectId(String(user_id));

        const trips = await db.collection('trips').find({ user_id: objectId }).toArray();

        if (trips.length === 0) {
            return res.status(404).json({ error: 'No trips found' });
        }

        res.json(trips);
    } catch (error) {
        console.error('Database connection or query error:', error);
        res.status(500).json({ error: 'An error occurred while retrieving the trips' });
    }
});

//TRIPS -- PUT to update trip
app.put('/api/users/:userId/trips/:tripId', async (req, res) => {
    const { userId, tripId } = req.params;
    const { name, city, start_date, end_date, notes, picture_url } = req.body;
    const tripObjId = new ObjectId(String(tripId));
    const userObjId = new ObjectId(String(userId));

    try {
        const db = client.db('xplora');

        const trip = await db.collection('trips').findOne({ _id: tripObjId, user_id: userObjId });

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found' });
        }

        const updatedTrip = {};
        if (name !== undefined) updatedTrip.name = name;
        if (city !== undefined) updatedTrip.city = city;
        if (start_date !== undefined) updatedTrip.start_date = start_date;
        if (end_date !== undefined) updatedTrip.end_date = end_date;
        if (notes !== undefined) updatedTrip.notes = notes;
        if (picture_url !== undefined) updatedTrip.picture_url = picture_url;

        const result = await db.collection('trips').updateOne(
            { _id: tripObjId },
            { $set: updatedTrip }
        );

        if (result.matchedCount > 0) {
            res.status(200).json({ message: 'Trip updated successfully' });
        } else {
            res.status(404).json({ error: 'Trip not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the trip' });
    }
});

//TRIPS -- DELETE to remove a trip from db
app.delete('/api/users/:userId/trips/:tripId', async (req, res) => {
    const { userId, tripId } = req.params;
    const tripObjId = new ObjectId(String(tripId));
    const userObjId = new ObjectId(String(userId));

    try {
        const db = client.db('xplora');

        const trip = await db.collection('trips').findOne({ _id: tripObjId, user_id: userObjId });

        if (!trip) {
            return res.status(404).json({ error: 'Trip not found or does not belong to this user' });
        }

        const result = await db.collection('trips').deleteOne({ _id: tripObjId });

        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Trip deleted successfully' });
        } else {
            res.status(404).json({ error: 'Trip not found' });
        }
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the trip' });
    }
});

//--------------------------------------
//ACTIVITY -- POST an activity to a trip
app.post('/api/users/:userId/trips/:tripId/activities', async (req, res) => {
    const { userId, tripId } = req.params;
    const userObjId = new ObjectId(String(userId));
    const tripObjId = new ObjectId(String(tripId));
    const { name, date, time, location, notes } = req.body;

    if (!name || !date || !time || !location || !notes) {
        return res.status(400).json({ error: 'Name, date, time, location and notes are required' });
    }

    try {
        const db = client.db('xplora');

        const existingActivity = await db.collection('activities').findOne({
            user_id: userObjId,
            trip_id: tripObjId,
            name,
            date,
            time,
            location,
            notes
        });

        if (existingActivity) {
            return res.status(409).json({ error: 'A similar activity already exists' });
        }

        const newActivity = {
            user_id: userObjId,
            trip_id: tripObjId,
            name,
            date,
            time,
            location,
            notes
        };

        const result = await db.collection('activities').insertOne(newActivity);
        res.status(201).json({ message: 'Activity added successfully', activity_id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while adding the activity' });
    }
});

//ACTIVITY -- GET all activities in a trip
app.get('/api/users/:userId/trips/:tripId/activities', async (req, res) => {
    const { userId, tripId } = req.params;
    const userObjId = new ObjectId(String(userId));
    const tripObjId = new ObjectId(String(tripId));

    try {
        const db = client.db('xplora');
        const activities = await db.collection('activities').find({ user_id: userObjId, trip_id: tripObjId }).sort({ date: 1 }).toArray();

        if (activities.length === 0) {
            return res.status(404).json({ error: 'No activities found for this trip.' });
        }

        res.json(activities);
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching activities' });
    }
});

//ACTIVITY -- PUT to update an activity
app.put('/api/users/:userId/trips/:tripId/activities/:activityId', async (req, res) => {
    const { userId, tripId, activityId } = req.params;
    const { name, date, time, location, notes } = req.body;

    const userObjId = new ObjectId(String(userId));
    const tripObjId = new ObjectId(String(tripId));
    const activityObjId = new ObjectId(String(activityId));

    try {
        const db = client.db('xplora');

        const activity = await db.collection('activities').findOne({ _id: activityObjId, user_id: userObjId, trip_id: tripObjId });

        if (!activity) {
            return res.status(404).json({ error: 'Activity not found' });
        }

        const updatedActivity = {};
        if (name !== undefined) updatedActivity.name = name;
        if (date !== undefined) updatedActivity.date = date;
        if (time !== undefined) updatedActivity.time = time;
        if (location !== undefined) updatedActivity.location = location;
        if (notes !== undefined) updatedActivity.notes = notes;

        const result = await db.collection('activities').updateOne(
            { _id: activityObjId },
            { $set: updatedActivity }
        );

        if (result.matchedCount > 0) {
            res.status(200).json({ message: 'Activity updated successfully' });
        } else {
            res.status(404).json({ error: 'Activity not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the activity' });
    }
});

//ACTIVITY --DELETE to remove an activity
app.delete('/api/users/:userId/trips/:tripId/activities/:activityId', async (req, res) => {
    const { userId, tripId, activityId } = req.params;
    const userObjId = new ObjectId(String(userId));
    const tripObjId = new ObjectId(String(tripId));
    const activityObjId = new ObjectId(String(activityId));

    try {
        const db = client.db('xplora');
        const result = await db.collection('activities').deleteOne({ _id: activityObjId, trip_id: tripObjId, user_id: userObjId });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Activity deleted successfully' });
        } else {
            res.status(404).json({ error: 'Activity not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the activity' });
    }
});

//----------------------------------
//FLIGHTS -- POST a flight to a trip
app.post('/api/trips/:id/flights', async (req, res) => {
    const { id } = req.params;
    const { user_id, trip_id, confirmation_num, flight_num, departure_airport, arrival_airport, departure_time, arrival_time, departure_date, arrival_date } = req.body;


    try {
        const db = client.db('xplora');

        const existingFlight = await db.collection('flights').findOne({
            user_id: MongoClient.ObjectId(user_id),
            trip_id: MongoClient.ObjectId(trip_id),
            confirmation_num,
            flight_num,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            departure_date,
            arrival_date
        });
        if (existingFlight) {
            return res.status(409).json({ error: 'A similar flight already exists' });
        }

        const newflight = {
            user_id: MongoClient.ObjectId(user_id),
            trip_id: MongoClient.ObjectId(trip_id),
            confirmation_num,
            flight_num,
            departure_airport,
            arrival_airport,
            departure_time,
            arrival_time,
            departure_date,
            arrival_date
        };

        const result = await db.collection('flights').insertOne(newFlight);
        res.status(201).json({ message: 'Activity added successfully', trip_id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while adding the flight' });
    }
});

//FLIGHTS -- GET all flights in a trip
app.get('/api/trips/:id/flights', async (req, res) => {
    const { id } = req.params;
    try {
        const db = client.db('xplora');
        const activities = await db.collection('flights').find({ trip_id: MongoClient.ObjectId(id) }).sort({ departure_date: 1 }).toArray();
        res.json(flights);
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching flights' });
    }
});

//FLIGHTS -- PUT to update a flight
app.put('/api/trips/:id/flights/:tripId', async (req, res) => {
    const { id, tripId } = req.params;
    const { user_id, trip_id, confirmation_num, flight_num, departure_airport, arrival_airport, departure_time, arrival_time, departure_date, arrival_date } = req.body;

    try {
        const db = client.db('xplora');
        const result = await db.collection('flights').updateOne(
            {
                user_id: MongoClient.ObjectId(id),
                trip_id: MongoClient.ObjectId(id),
                _id: MongoClient.ObjectId(flightId)
            },
            {
                $set: {
                    confirmation_num,
                    flight_num,
                    departure_airport,
                    arrival_airport,
                    departure_time,
                    arrival_time,
                    departure_date,
                    arrival_date
                }
            }
        );
        if (result.matchedCount > 0) {
            res.status(200).json({ message: 'Flight updated successfully' });
        } else {
            res.status(404).json({ error: 'Flight not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the flight' });
    }
});
//FLIGHTS --DELETE to remove a flight
app.delete('/api/trips/:id/flights/:flightId', async (req, res) => {
    const { id, flightId } = req.params;
    try {
        const db = client.db('xplora');
        const result = await db.collection('flights').deleteOne(
            {
                user_id: MongoClient.ObjectId(id),
                trip_id: MongoClient.ObjectId(id),
                _id: MongoClient.ObjectId(flightId)
            });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Flight deleted successfully' });
        } else {
            res.status(404).json({ error: 'Flight not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the flight' });
    }
});


//-----------------------------------------------
//ACCOMMODATIONS -- POST accommodations to a trip
app.post('/api/trips/:id/accommodations', async (req, res) => {
    const { id } = req.params;
    const { user_id, trip_id, confirmation_num, name, address, checkin_date, checkout_date, checkout_time, checkin_time, } = req.body;


    try {
        const db = client.db('xplora');

        const existingAccommodations = await db.collection('accommodations').findOne({
            user_id: MongoClient.ObjectId(user_id),
            trip_id: MongoClient.ObjectId(trip_id),
            confirmation_num,
            name,
            address,
            checkin_date,
            checkout_date,
            checkout_time,
            checkin_time,

        });
        if (existingAccommodations) {
            return res.status(409).json({ error: 'A similar accommodations already exists' });
        }

        const newAccommodations = {
            user_id: MongoClient.ObjectId(user_id),
            trip_id: MongoClient.ObjectId(trip_id),
            confirmation_num,
            name,
            address,
            checkin_date,
            checkout_date,
            checkout_time,
            checkin_time,

        };

        const result = await db.collection('accommodations').insertOne(newAccommodations);
        res.status(201).json({ message: 'accommodations added successfully', trip_id: result.insertedId });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while adding the accommodations' });
    }
});

//ACCOMMODATIONS -- GET all accommodations in a trip
app.get('/api/trips/:id/accommodations', async (req, res) => {
    const { id } = req.params;
    try {
        const db = client.db('xplora');
        const accommodations = await db.collection('accommodations').find({ trip_id: MongoClient.ObjectId(id) }).sort({ checkin_time: 1 }).toArray();
        res.json(accommodations);
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while fetching accommodations' });
    }
});


//ACCOMMODATIONS -- PUT to update accommodations
app.put('/api/trips/:id/accommodations/:tripId', async (req, res) => {
    const { id, tripId } = req.params;
    const { user_id, trip_id, confirmation_num, name, address, checkin_date, checkout_date, checkout_time, checkin_time, } = req.body;

    try {
        const db = client.db('xplora');
        const result = await db.collection('accommodations').updateOne(
            {
                user_id: MongoClient.ObjectId(id),
                trip_id: MongoClient.ObjectId(id),
                _id: MongoClient.ObjectId(accommodationsId)
            },
            {
                $set: {
                    confirmation_num,
                    name,
                    address,
                    checkin_date,
                    checkout_date,
                    checkout_time,
                    checkin_time,

                }
            }
        );
        if (result.matchedCount > 0) {
            res.status(200).json({ message: 'Accommodations updated successfully' });
        } else {
            res.status(404).json({ error: 'Accommodations not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while updating the accommodations' });
    }
});

//ACCOMMODATIONS --DELETE to remove accommodations
app.delete('/api/trips/:id/accommodations/:accommodationsId', async (req, res) => {
    const { id, accommodationsId } = req.params;
    try {
        const db = client.db('xplora');
        const result = await db.collection('accommodations').deleteOne(
            {
                user_id: MongoClient.ObjectId(id),
                trip_id: MongoClient.ObjectId(id),
                _id: MongoClient.ObjectId(accommodationsId)
            });
        if (result.deletedCount > 0) {
            res.status(200).json({ message: 'Accommodations deleted successfully' });
        } else {
            res.status(404).json({ error: 'Accommodations not found' });
        }
    }
    catch (error) {
        res.status(500).json({ error: 'An error occurred while deleting the accommodations' });
    }
});

//---------
//PASWORD RESET APIs

const crypto = require('crypto');
const nodemailer = require('nodemailer');

app.post('/api/forgot-password', async (req, res) => {
    const { email } = req.body;

    try {
        const db = client.db('xplora');
        const user = await db.collection('users').findOne({ email });

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        const resetToken = crypto.randomBytes(32).toString('hex');
        const resetTokenExpiration = Date.now() + 3600000; // one hour

        await db.collection('users').updateOne(
            { _id: user._id },
            { $set: { resetToken, resetTokenExpiration } }
        );

        const transporter = nodemailer.createTransport({
            service: 'Proton',
            auth: {
                user: 'team10poosd@proton.me',
                pass: 'FriendersTeam10!',
            },
        });

        const mailOptions = {
            from: 'team10poosd@proton.me',
            to: user.email,
            subject: 'Password Reset Request',
            text: `You requested a password reset. Click the link below to reset your password:
            http://your-domain.com/reset-password?token=${resetToken}&id=${user._id}`
        };

        await transporter.sendMail(mailOptions);
        res.status(200).json({ message: 'Password reset email sent' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while requesting password reset' });
    }
});

app.post('/api/reset-password', async (req, res) => {
    const { token, id, newPassword } = req.body;

    try {
        const db = client.db('xplora');
        const user = await db.collection('users').findOne({
            _id: MongoClient.ObjectId(id),
            resetToken: token,
            resetTokenExpiration: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const hashedPassword = crypto.createHash('sha256').update(newPassword).digest('hex');

        await db.collection('users').updateOne(
            { _id: user._id },
            {
                $set: { password: hashedPassword },
                $unset: { resetToken: "", resetTokenExpiration: "" }  // Remove reset fields
            }
        );

        res.status(200).json({ message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ error: 'An error occurred while resetting the password' });
    }
});

// WRITE EVERYTHING ABOVE THESE LINES

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});

