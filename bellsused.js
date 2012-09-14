//=============================================================================
//  MuseScore
//
//  Bells Used Plugin v 1.0  
//
//  Copyright (C)2012 Nicholas Barnard
//  Portions Copyright (C)2011 Mike Magatagan
//  Derived from Mike Magatagan's Count Notes plugin
//
//  This program is free software; you can redistribute it and/or modify
//  it under the terms of the GNU General Public License version 2.
//
//  This program is distributed in the hope that it will be useful,
//  but WITHOUT ANY WARRANTY; without even the implied warranty of
//  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
//  GNU General Public License for more details.
//
//  You should have received a copy of the GNU General Public License
//  along with this program; if not, write to the Free Software
//  Foundation, Inc., 675 Mass Ave, Cambridge, MA 02139, USA.
//=============================================================================
//
// This is ECMAScript code (ECMA-262 aka "Java Script")
//
var g_pitch = []; // Pitch array
var g_dialog; // Global containing dialog

// A blank function, since we don't need to run when MuseScore loads or closes, only when we're called.

function GNDN() {}

// Display Dialog

function displayDialog() {
	var loader, file;
	
	if (curScore === undefined) {
		QMessageBox.critical(g_dialog, "Feedback", "Please Open or Select a Score from which to Create a Bells Used Display.");
		return;
	}
	loader = new QUiLoader(null);
	file = new QFile(pluginPath + "/bellsused.ui");
	file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
	g_dialog = loader.load(file, null);
	g_dialog.buttonBox.accepted.connect(processForm);
	g_dialog.show();
}

// Process the Form

function processForm() {

	// Gather the Used Pitches
	populatePitches();
	
	if (g_dialog.NewScore.checked) {
		scoreBUC();
	}
	if (g_dialog.TextFile.checked || g_dialog.CSVFile.checked) {
		textBUC();
	}
}


// Goes through the whole score Chord by Chord and populates the notes used into Pitch Array.

function populatePitches() {
	var idx, cursor, staff, voice, i, note, pitch, tone, chord, n;


	// Fill the pitch array with blanks.
	for (idx = 0; idx < 127; idx++) {
		g_pitch[idx] = blankPitch();
	}


	cursor = new Cursor(curScore);

	// Loop through Each individual Staff
	for (staff = 0; staff < curScore.staves; ++staff) {
		cursor.staff = staff;

		// Loop through each individual voice
		for (voice = 0; voice < 4; voice++) {
			cursor.voice = voice;
			cursor.rewind(); // set cursor to first chord/rest

			// Make sure we're not at the end of the score.
			while (!cursor.eos()) {
				// We're only going to process this if it is a chord.
				if (cursor.isChord()) {
					// Set us up to cycle through each individual note of the chord.
					chord = cursor.chord();
					n = chord.notes;
					for (i = 0; i < n; i++) {
						note = chord.note(i);
						pitch = note.pitch;
						tone = note.tpc;

						// Check to see if the pitch is already used, if not add it.
						if (g_pitch[pitch].used) {
							// Check to see if the enharmonic is already listed, if not add it.
							if (!contains(g_pitch[pitch].enharmonic, tone)) {
								g_pitch[pitch].enharmonic.push(tone);
							}
						} else {
							g_pitch[pitch].used = true;
							g_pitch[pitch].enharmonic[0] = tone;
						}
					}
				}
				// Move the cursor to the next position.
				cursor.next();
			}
		}
	}

	// Create a Blank Pitch Object

	function blankPitch() {
		var blank = {};

		blank.used = false;
		blank.enharmonic = [];

		return blank;
	}

}

// Generates Text Based BUCs
//

function textBUC() {

	var idx, fName, file, textStream, octave, x, minPitch, maxPitch, maxOctave = 0,
		NumBellsUsed = 0,
		NumAccidentalsUsed = 0,
		title, composer, clipboardBuf, oClipboard, oText;

	oClipboard = g_dialog.ToClipboard.checked;
	oText = g_dialog.TextFile.checked;

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	if (!startOutput()) {
		return;
	}

	minPitch = findLowPitch();
	maxPitch = findHighPitch();
	
	// Write out the header for the piece. If we have the title and the composer output both. 
	// If we have just the title output it. If we have neither. don't output any of it.
	// MuseScore returns an empty string instead of undefined, so we test for that.
	if (oText) {
		writeOutput("Notes Used");
		if (title !== "") {
			writeOutput(" in \"" + title + "\"");
			if (composer !== "") {
				writeOutput(" By: " + composer);
			}
		}
		writeOutput(":\r\n");
	} else {
		if (g_dialog.IncludeHeader.checked) {
			// Write out all the header including all the notes in order
			writeOutput("Title,Composer,Low Pitch,High Pitch,Octaves Used,");

			for (x = 0; x < 127; x++) {
				writeOutput(noteName(x, primaryEnharmonicRep(x)) + ",");
			}
			writeOutput("\r\n");
		}
		if (title !== "") {
			writeOutput(title + ",");
			if (composer !== "") {
				writeOutput(composer + ",");
			} else {
				writeOutput(",");
			}
		} else {
			writeOutput(",,");
		}

		// sort the enharmonics for the min and the max pitch         
		g_pitch[minPitch].enharmonic.sort(sortenharmonics);
		g_pitch[maxPitch].enharmonic.sort(sortenharmonics);

		writeOutput(noteName(minPitch, g_pitch[minPitch].enharmonic[0]) + ",");
		writeOutput(noteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + ",");
		writeOutput(((findOctave(maxPitch) - findOctave(minPitch)) + 1) + ",");
	}

	// Iterate through all the notes from the bottom to the top printing out the ones that are used.
	for (idx = 0; idx < 127; idx++) {

		// Check if note is unused, if so process properly  
		if (!g_pitch[idx].used) {
			// Print an empty cell for CSV
			if (!oText) {
				writeOutput(",");
			}
			continue; // Skip the rest of the loop
		}

		// Find the proper octave
		octave = findOctave(idx);
		// update the number of bells used
		NumBellsUsed++;
		// sort the enharmonics 
		g_pitch[idx].enharmonic.sort(sortenharmonics);

		// cycle through the whole enharmonic array
		for (x = 0; x < g_pitch[idx].enharmonic.length; x++) {
			// If this enharmonic is contained within the enharmonic only array and this is our first time through increment the accidentals.
			if (onlyAccidentalRep(g_pitch[idx].enharmonic[x]) && x === 0) {
				NumAccidentalsUsed++;
			}

			// If we're starting a new octave put an extra line feed for text output in and set the highest octave
			if ((oText) && (octave > maxOctave)) {
				maxOctave = octave;
				writeOutput("\r\n");
			}

			// If we have more than one enharmonic seperate them with a slash for text, a dash for CSV.
			if (x !== 0) {
				if (oText) {
					writeOutput("\\");
				} else {
					writeOutput("-");
				}
			}

			writeOutput(noteName(idx, g_pitch[idx].enharmonic[x]));


		}

		// if its text output output a linefeed, if CSV output output a comma.
		if (oText) {
			writeOutput("\r\n");
		} else {
			writeOutput(",");
		}
	}

	if (oText) {
		writeOutput("\r\n" + ((findOctave(maxPitch) - findOctave(minPitch)) + 1) + " octaves with " + NumBellsUsed + " bells used ranging from " + noteName(minPitch, g_pitch[minPitch].enharmonic[0]) + " to " + noteName(maxPitch, g_pitch[maxPitch].enharmonic[0]) + " with " + NumAccidentalsUsed + " accidentals.\r\n");
	}

	endOutput();
	
	// Return the highest pitch.
	function findHighPitch(){
		var x;
		for(x=126; !g_pitch[x].used; x--) { }

		// Wherever the for loop stopped is the end.
		return x;		
	}	

	// Return the lowest pitch.
	function findLowPitch(){
		var x;
		for(x=0; !g_pitch[x].used; x++) { }

		// Wherever the for loop stopped is the end.
		return x;	
	}

	
	// Returns True if the primary representation of this note is an acidental 
	
	function onlyAccidentalRep (enharmonic) {
		// These are enharmonics that can only be expressed as a sharp or flat
		var OnlyAccidental = [-1, 0, 8, 9, 10, 11, 12, 20, 21, 22, 23, 24, 32, 33];
		
		return contains(OnlyAccidental, enharmonic);
	}
	
	// Returns the primary enharmonic given a pitch. 
	// Primary Enharmonic is the Natural or Sharp representation of a note
	function primaryEnharmonicRep(pitch) {
		// This the order of enharmonics e.g. 14=C, 21=C#, etc.
		var EnharmonicOrder = [14, 21, 16, 23, 18, 13, 20, 15, 22, 17, 24, 19];
		
		return EnharmonicOrder[pitch % 12];
	}

	// Sorts enharmonics from most preferred to least preferred.
	// We prefer a natural to any accidental, and a single accidental to a double accidental.

	function sortenharmonics(a, b) {
		// Primary representation of notes are between 13 and 24. If a or b is in that range it should be first.
		if ((a >= 13) && (a <= 24)) {
			return -1;
		}

		if ((b >= 13) && (b <= 24)) {
			return 1;
		}

		// Tertiary notes are <=5 or >=30 they should be last. If a or b is in that range it should be last.
		if ((a <= 5) || (a >= 30)) {
			return 1;
		}

		if ((b <= 5) || (b >= 30)) {
			return -1;
		}

		// Although in practice we shouldn't get two values that could be considered equal, just in case we somehow did.
		return 0;
	}
	// Return the note name

	function noteName(pitch, enharmonic) {
		var notes = ["C", "G", "D", "A", "E", "B", "F"],
			accidental, accsymbols = ["bb", "b", "", "#", "##"];

		// find and assign the proper accidental		
		accidental = 	enharmonic < 6  ? 0 :
						enharmonic < 13 ? 1 :
						enharmonic < 20 ? 2 :
						enharmonic < 27 ? 3 :
								 		  4;

		// the enharmonics nicely line up with note names for mod 7
		return (notes[enharmonic % 7] + accsymbols[accidental] + findOctave(pitch));

	}

	// Given a pitch, return what octave it is in.
	function findOctave(pitch) {
		// Find the proper octave and return it. Despite this looking odd a case/switch wouldn't work here
		// And thanks to Ben its so much cleaner than a series of If/Else statements

		return pitch < 12 ? 0 : pitch < 24 ? 1 : pitch < 36 ? 2 : pitch < 48 ? 3 : pitch < 60 ? 4 : pitch < 72 ? 5 : pitch < 84 ? 6 : pitch < 96 ? 7 : pitch < 108 ? 8 : pitch < 120 ? 9 : 10;
	}
	// Start the output. 

	function startOutput() {

		if (!oClipboard) {
			// Open a file selection dlg
			if (oText) {
				fName = QFileDialog.getSaveFileName(g_dialog, "Select .txt file to create", "", "TXT file (*.txt)", 0);
			} else {
				fName = QFileDialog.getSaveFileName(g_dialog, "Select .csv file to create", "", "CSV file (*.csv)", 0);
			}

			if (fName === null || fName === "") {
				return false;
			}
			// Open data file as a text stream
			//
			file = new QFile(fName);
			if (file.exists()) {
				file.remove();
			}
			if (!file.open(QIODevice.ReadWrite)) {
				QMessageBox.critical(g_dialog, "File Error", "Could not create output file " + fName);
				return false;
			}
			textStream = new QTextStream(file);
			return true;
		} else {
			// Initialize clipboard buffer with a blank.
			clipboardBuf = "";
			return true;
		}
	}

	// Add to our output

	function writeOutput(buf) {
		if (!oClipboard) {
			textStream.writeString(buf);
		} else {
			clipboardBuf = clipboardBuf + buf;
		}
	}
	// Close our output.

	function endOutput() {
		if (!oClipboard) {
			file.close();
		} else {
			QApplication.clipboard().setText(clipboardBuf, 0);
			QMessageBox.information(g_dialog, "Complete", "Bells Used on Clipboard");
		}
		return;
	}
}


function scoreBUC() {
	var title, composer, measurelen, idx, score, cursor, lastnote, basslen, treblelen, chord, note;

	// Set up some details for later
	title = curScore.title;
	composer = curScore.composer;

	// Find the number of notes in each clef
	basslen = notesInBass();
	treblelen = notesInTreble();

	// Assign measure length to the larger between the notes in the Bass or treble clef.
	measurelen = Math.max(basslen, treblelen);

	// The last note written is a Note object. MuseScore sets lastnote.pitch = 0 here.
	lastnote = new Note();

	// Create the Score	
	score = new Score();
	
	score.title = title + " - Bells Used";
	score.composer = composer;

	// Make a measure of the appropriate length, so there are no barlines in the BUC.
	score.timesig =  new TimeSig(measurelen, 4);
	// Be explicit: we want C Major/A Minor (0 flats/sharps) in key sig.
	score.keysig = 0;

	// create two staff piano part, sadly the format for bells isn't what we'd like
	score.appendPart("Piano");
	score.appendMeasures(1);
	cursor = new Cursor(score);

	// Bass Clef
	cursor.staff = 1;
	cursor.voice = 0;
	cursor.rewind();

	// add the bass clef notes
	for (idx = 0; idx <= 61; idx++) {
		// Process the pitch, and if we added a pitch set the last note value
		if (processPitch(idx)) {
			lastnote.pitch = idx;
			lastnote.tpc = lastTPC(idx);
		}
	}

	// If we have fewer bass notes than treble notes add a hidden padding note.
	if (basslen < treblelen) {
		addEndNote();
	}


	// Treble Clef
	cursor.staff = 0;
	cursor.voice = 0;
	cursor.rewind();

	// add the treble clef notes
	for (idx = 62; idx <= 126; idx++) {
		// Process the pitch, and if we added a pitch set the last note value
		if (processPitch(idx)) {
			lastnote.pitch = idx;
			lastnote.tpc = lastTPC(idx);
		}
	}

	// If we have fewer treble notes than bass notes add a hidden padding note.
	if (treblelen < basslen) {
		addEndNote();
	}
	
	// by ending the "undo" it'll display the score.
	score.endUndo();

	
	return;


	function processPitch(pitch) {
		var x, numEnharmonics;

		numEnharmonics = g_pitch[pitch].enharmonic.length;

		// if the pitch isn't used do nothing.
		if (!g_pitch[pitch].used) {
			return false;
		}

		// Sort the enharmonics from greatest to least
		// Which is the pitch represented as the representation of the lowest note first.
		g_pitch[pitch].enharmonic.sort(function (a, b) {
			return b - a
		});

		for (x = 0; x < numEnharmonics; x++) {
			// Create the Chord Length
			chord = new Chord();
			chord.tickLen = 480;

			// Add the pitch to the Chord.
			note = new Note();
			note.pitch = pitch;
			note.tpc = g_pitch[pitch].enharmonic[x];


			// Check if the previously printed note has the same root pitch and octave, but a flat in front of it.
			// If so print the previous note again, so we don't get unwanted natural symbol. - Issue #6

			if (pitch !==0 && lastnote.pitch !==0 && (pitch - 1 === lastnote.pitch) && isFlat(lastnote.tpc) && (rootNote(lastnote.tpc) === rootNote(note.tpc))) {
				note.pitch = lastnote.pitch;
				note.tpc = lastnote.tpc;
			}
			
			// Print the right notehead type if there is another enharmonic representing this pitch.
			// Print an X note head if this isn't the most primary representation of an enharmonic
			
			if (notPrimary(note.tpc) && numEnharmonics !== 1 && (numEnharmonics === 3 || isTertiary(note.tpc))) {
			 		note.noteHead = 1; 
			}
			
			chord.addNote(note);
			cursor.add(chord);

			chord = cursor.chord();
			chord.noStem = true;

			cursor.next();

		}
		return true;		
		
		// Returns true if tpc represents is a flat or double flat.
		function isFlat(tpc) {
			return tpc < 13;
		}
		
		// Root Note
		function rootNote(tpc) {
			return tpc % 7;
		}
		
		// Is tpc something other than primary?
		function notPrimary(tpc) {
			return tpc < 13 || tpc > 24;
		}
		
		// Is tpc tertiary? (or is it Ab which is secondary without a tertiary representation.)
		function isTertiary(tpc) {
			return tpc < 6 || tpc > 29 || tpc === 10;
		}

	}

		// Return the TPC last printed TPC. Assumes enharmonic array is sorted greatest to least.
		function lastTPC(pitch){
			var lastenharmonic;
			
			lastenharmonic = g_pitch[pitch].enharmonic.length - 1;
		
			return g_pitch[pitch].enharmonic[lastenharmonic];
		} 


	function addEndNote() {
		chord = new Chord();
		// Figure out the length of the hidden note.
		chord.tickLen = Math.abs(basslen - treblelen) * 480;

		// Make the note as the same pitch and enharmonic as the previous note.
		note = new Note();
		note.pitch = lastnote.pitch;
		note.tpc = lastnote.tpc;

		note.visible = false;
			
		chord.addNote(note);
		cursor.add(chord);
		
		chord = cursor.chord();
		chord.noStem = true;
	}

	function notesInTreble(){
	// Middle D (Midi Value 62) and higher in treble 
		return notesInRange(62, 126);
	}
	
	function notesInBass(){
	// Middle C# (Midi Value 61) and lower in the Bass,
		return notesInRange(0, 61);
	}

	function notesInRange(begin, end) {
		var usedpitches = 0,
			x;

		// Work through the range and add up the number of individual notes we have to display.
		for (x = begin; x <= end; x++) {
			if (g_pitch[x].used) {
				usedpitches = usedpitches + g_pitch[x].enharmonic.length;
			}
		}
		return usedpitches;
	}
}


// See if an array contains an object from http://stackoverflow.com/questions/237104/array-containsobj-in-javascript
function contains(a, obj) {
	var i;
	for (i = 0; i < a.length; i++) {
		if (a[i] === obj) {
			return true;
		}
	}
	return false;
}

// Defines how MuseScore interacts with this plugin
var mscorePlugin = {
	majorVersion: 1,
	minorVersion: 1,
	menu: 'Plugins.Bells Used',
	init: GNDN,
	run: displayDialog
};

mscorePlugin;