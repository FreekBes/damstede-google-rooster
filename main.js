const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/calendar'];
const TOKEN_PATH = 'token.json';

fs.readFile('credentials.json', function(err, content) {
    if (err) return console.log('Error loading client secret file: ', err);
    authorize(JSON.parse(content), updateCalendar);
});

function authorize(credentials, callback) {
    const {client_secret, client_id, redirect_uris} = credentials.installed;
    const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);

    fs.readFile(TOKEN_PATH, function(err, token) {
        if (err) return getAccessToken(oAuth2Client, callback);
        oAuth2Client.setCredentials(JSON.parse(token));
        callback(oAuth2Client);
    });
}

function getAccessToken(oAuth2Client, callback) {
    const authUrl = oAuth2Client.generateAuthUrl({
        access_type: 'offline',
        scope: SCOPES
    });
    console.log("Authorize this app by visiting this URL: ", authUrl);

    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    rl.question("Enter the code from that page here: ", function(code) {
        rl.close();
        oAuth2Client.getToken(code, function(err, token) {
            if (err) return console.error("Error retrieving access token", err);
            oAuth2Client.setCredentials(token);
            fs.writeFile(TOKEN_PATH, JSON.stringify(token), function(err) {
                if (err) return console.error(err);
                console.log('Token stored to', TOKEN_PATH);
            });
            callback(oAuth2Client);
        });
    });
}

function updateCalendar(auth) {
    const calendar = google.calendar({version: 'v3', auth});
    calendar.events.list({
        calendarId: 'primary',
        timeMin: (new Date()).toISOString(),
        maxResults: 10,
        singleEvents: true,
        orderBy: 'startTime'
    }, function(err, res) {
        if (err) return console.error('The API returned an error: ', err);
        const events = res.data.items;
        if (events.length > 0) {
            console.log("Upcoming 10 events:");
            events.map(function(event, i) {
                const start = event.start.dateTime || event.start.date;
                console.log(`${start} - ${event.summary}`);
            });
        }
        else {
            console.log("No upcoming events found.");
        }
    });
}