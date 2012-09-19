//=============================================================================
//  MuseScore
//
//  Bells Used Chart Plugin v 1.0  
//  Preferences Plugin  
//
//  Copyright (C)2012 Nicholas Barnard
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

var g_settings, g_UIMessage, g_UIOptions;

// A blank function, since we don't need to run when MuseScore loads or closes, only when we're called.

function GNDN() {}

function checkBlankInstrumentModal() {
	if (g_UIPrefs.checkBlankInstrument.checked) {
		QMessageBox.information(g_UIMessage, "Instrument Must be Installed", "Before using this feature please install the instrument as described at <a href=\"http://www.inmff.net/bleh/\">http://www.inmff.net/bleh/</a>");
	}
}


// Loads settings into UI
function loadPresetUIOptions() {
	// Get Settings and populate the form
	g_settings = new QSettings(QSettings.NativeFormat, QSettings.UserScope, "MusE", "pluginBellsUsed", null);

	g_UIOptions.radioScore.checked = g_settings.value("Score", false);
	g_UIOptions.radioText.checked = g_settings.value("Text", false);
	g_UIOptions.radioCSV.checked = g_settings.value("CSV", false);
	g_UIOptions.textOutput.checkClipboard.checked = g_settings.value("Clipboard", false);
	g_UIOptions.textOutput.checkUseRealSharpFlat.checked = g_settings.value("UseRealSharpFlat", true);
	g_UIOptions.checkCSVHeader.checked = g_settings.value("CSVHeader", true);
}

function displayStaticDefaults() {
	var loader, file;
	// Load the form so we can populate it.
	loader = new QUiLoader(null);
	file = new QFile(pluginPath + "/bellsused.ui");
	file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));

	g_UIOptions = loader.load(file, null);

	loadPresetUIOptions();

	g_UIOptions.windowTitle = "Select Static Defaults";

	// connect signals
	g_UIOptions.buttonBox.accepted.connect(saveUIOptionsSettings);
	g_UIOptions.radioScore.toggled.connect(changedRadio);
	g_UIOptions.radioText.toggled.connect(changedRadio);
	g_UIOptions.radioCSV.toggled.connect(changedRadio);

	changedRadio();

	// Calling Exec so this is Modal.
	g_UIOptions.exec();

}

function saveUIOptionsSettings() {
	g_settings.setValue("Score", g_UIOptions.radioScore.checked);
	g_settings.setValue("Text", g_UIOptions.radioText.checked);
	g_settings.setValue("CSV", g_UIOptions.radioCSV.checked);
	g_settings.setValue("Clipboard", g_UIOptions.textOutput.checkClipboard.checked);
	g_settings.setValue("UseRealSharpFlat", g_UIOptions.textOutput.checkUseRealSharpFlat.checked);
	g_settings.setValue("CSVHeader", g_UIOptions.checkCSVHeader.checked);

	// Save to disk
	g_settings.sync();
}

// Adjust the visible elements on the form per the current checked radio button.
function changedRadio() {
	if (g_UIOptions.radioText.checked) {
		g_UIOptions.textOutput.enabled = true;
		g_UIOptions.checkCSVHeader.visible = false;
		return;
	}
	if (g_UIOptions.radioCSV.checked) {
		g_UIOptions.textOutput.enabled = true;
		g_UIOptions.checkCSVHeader.visible = true;
		return;
	}

	// No radio is selected, or radioScore is selected.
	g_UIOptions.textOutput.enabled = false;
	g_UIOptions.checkCSVHeader.visible = false;
	return;

}

// Loads settings into UI
function loadPresetUIOptions() {
	// Get Settings and populate the form
	g_settings = new QSettings(QSettings.NativeFormat, QSettings.UserScope, "MusE", "pluginBellsUsed", null);

	g_UIOptions.radioScore.checked = g_settings.value("Score", false);
	g_UIOptions.radioText.checked = g_settings.value("Text", false);
	g_UIOptions.radioCSV.checked = g_settings.value("CSV", false);
	g_UIOptions.textOutput.checkClipboard.checked = g_settings.value("Clipboard", false);
	g_UIOptions.textOutput.checkUseRealSharpFlat.checked = g_settings.value("UseRealSharpFlat", true);
	g_UIOptions.checkCSVHeader.checked = g_settings.value("CSVHeader", true);
}

function showPreferences() {
	var loader, file;

	// We need to use typeof here instead of directly checking for undefined as the variable doesn't exist until a score is opened.
	if (typeof curScore === 'undefined') {
		QMessageBox.warning(g_UIMessage, "Warning", "Please Open or Select a Score from which to Create a Bells Used.");
		return;
	}

	loader = new QUiLoader(null);
	file = new QFile(pluginPath + "/bellsused_prefs.ui");
	file.open(QIODevice.OpenMode(QIODevice.ReadOnly, QIODevice.Text));
	g_UIPrefs = loader.load(file, null);

	g_settings = new QSettings(QSettings.NativeFormat, QSettings.UserScope, "MusE", "pluginBellsUsed", null);
	g_UIPrefs.checkBlankInstrument.checked = g_settings.value("UseBlankInstrument", false);
	g_UIPrefs.checkCacheSettings.checked = g_settings.value("cacheSettings", true);
	g_UIPrefs.checkBypassDialog.checked = g_settings.value("showDialog", true);

	// Connect Slots
	g_UIPrefs.checkBlankInstrument.toggled.connect(checkBlankInstrumentModal);
	g_UIPrefs.buttonStaticDefaults.clicked.connect(displayStaticDefaults);
	g_UIOptions.buttonBox.accepted.connect(saveUIPrefsSettings);

	g_UIPrefs.show();

}

function saveUIPrefsSettings() {
	g_settings.setValue("UseBlankInstrument", g_UIPrefs.checkBlankInstrument.checked);
	g_settings.setValue("cacheSettings", g_UIPrefs.checkCacheSettings.checked);
	g_settings.setValue("showDialog", g_UIPrefs.checkBypassDialog.checked);

	// Save to disk
	g_settings.sync();
}

var bellsUsedPrefs = {
	majorVersion: 1,
	minorVersion: 1,
	menu: 'Plugins.Bells Used.Preferences',
	init: GNDN,
	run: showPreferences
};

bellsUsedPrefs;
