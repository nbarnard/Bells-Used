
Bells-Used
==========

Bells Used Plugin for MuseScore 1.2

Bells Used Plugin is for MuseScore 1.2. It generates Bells Used information and can present it in a score format, a text file, or a CSV file for use with spreadsheet software.
Getting Started

To Install Bells Used Plugin:
1. Download the ZIP file.
2. Unzip the file.
3. Close MuseScore.
4. Place the files in the MuseScore Plugin Directory. 5. Load MuseScore.
6. The plugin can be accessed from the Plugin->Bells Used Menu

Documentation Note
==================
This documentation is text only. Please see README.pdf for a version with inline images.

Using the Plugin
================

When you are ready to create a Bells Used Chart, select it from the plugin menu.
There are several options that can be selected each time the plugin is run. By default the plugin will store your last used options.

Score
-----
By default the Bells Used Plugin will create a new score.
By default the plugin will create a score with the Piano as the instrument. See Blank Name Instrument to create a score without the Piano name.

Plain Text
----------

When Plain Text output is selected there are two additional options available:
Use "Real" sharps and flats: When checked the plugin will use Unicode Sharp, Flat, Double Sharp, and Double Flat symbols in text outputs. Uncheck this option if the text is not readable. If this option is unchecked the plugin will output "#" for Sharps and "b" for Flats, utilizing two of each character for Double Sharps and Double Flats Copy to Clipboard: When checked, the plugin will copy the Bells Used information to the clipboard instead of saving the information to a file.
￼￼￼￼￼

CSV
---
When CSV output is selected, all the plain text options are available, and an additional option is available:
Include Header Row: When checked, the first row of the CSV file will have a header describing each of the columns.

Bells Not Used
==============

Bells Not Used is a companion plugin that will output the bells not used. The plugin will automatically detect the minimum octave set required to play the piece, and it will print the notes that are not needed from this set. This plugin shares the default options with the Bells Used Plugin.


Preferences
===========

The Bells Used Plugin has several options that you can set to streamline your workflow. These options affect both the Bells Used and the Bells Not Used options.
Use Blank Name Instrument: Uses an instrument without a title instead of the Piano. To function properly, the instrument must be installed as described in the Blank Name Instrument Installation section.
Save Last Used Output Options: When checked, the plugin will save the previous last used output options for the next use. If unchecked the plugin will use the last saved options.
Bypass Output Options Dialog: When checked the plugin will not present the output options dialog, and instead will use the last saved or the default options.
Set Default Options: Will bring up a dialog that allows you to set the default options. These options will be overwritten last used options if Save Last Used Output Options above is checked.

Blank Name Instrument
=====================
When creating a score bells used chart, the plugin selects Piano as the default instrument. (The preinstalled Handbell instrument is divided into two instruments, "High Hand Bells" and "Low Hand Bells".) The plugin can utilize an instrument with a blank name. This special instrument is included with the plugin in the instruments directory.

￼￼￼￼￼￼￼

Installing the Blank Name Instrument
------------------------------------
If you have customized your instruments.xml file you must manually add the instrument from the "instruments/blankinstrument.xml" file. A majority of users have not customized their instruments.xml file.
If you have not customized your instruments.xml file, the plugin includes versions of the standard instruments.xml files with the blank name instrument added. To switch to utilizing this file instead of the built in file:
1. From MuseScore open the Preferences Pane. (On Mac OS X: Select the MuseScore Menu then Preferences. On Windows or Linux: Select the Edit Menu then Preferences.)
2. Select the General Tab.
3. Click the folder icon next to Instrument List.
4. Select the correct instruments.xml for your language. The instruments files are located in the /instruments/ in the MuseScore Plugin Directory.
5. Save the preferences.
￼￼

Score Output Quirks
===================
When generating a score, the Bells Used Plugin generates a score that is visually correct when printed, but it needs several adjustments to achieve this presentation.
Notes that are already represented by a different enharmonic representation are printed with an X note head. (Preexisting precedent is to place the related enharmonics within parentheses. MuseScore does not allow plugins to access the parenthesis symbols.)
Notes that follow their related flat are printed as a flat, per precedent for Bells Used Charts. The plugin will properly adjust for this when generating Bells Used or Bells Not Used information from an existing Bell Used Score. (This is due to a restriction on plugins in MuseScore being unable to hide or suppress an accidental symbol.)
Several quarter notes are written in the staff that has a lesser number of notes. These notes are automatically hidden and are not visible in the printed form (This is due to a restriction on plugins in MuseScore being unable to hide rests.)

Questions and Answers
=====================
Why doesn't the plugin do everything Finale's Create Handbells Used Chart plug-in does?
---------------------------------------------------------------------------------------
The plugin does implement many of the features from Finale's Create Handbells Used Chart plug-in. In some cases it offers additional options, and in other cases it implements the most commonly used options. If you would like additional options, please email Nick Barnard at bellsnick@inmff.net with your request.
￼￼￼￼

Why doesn't the plugin work on MuseScore 2.0?
---------------------------------------------
At the moment, MuseScore 2.0 doesn't allow for plugins to have their own user interfaces. Once this functionality matures in MuseScore 2.0 a version will be offered for that system.

Why doesn't the plugin do X?
----------------------------
I'm not sure. There may or may not be a good reason, although we have already considered and rejected writing in a combination hooka and coffee maker, that also makes julienne fries! You're encouraged to request additional features, please email Nick Barnard at bellsnick@inmff.net with your ideas.

Version History
===============
v 1.04 – 11 November, 2013 – Small Code Cleanup Release. v 1.03 – 23 June 23, 2013 – Bug Fix Release.
v 1.02 – 8 October 2012 – Bug Fix Release.
v 1.01 – 30 September 2012 – Bug Fix Release.
v 1.0 – 28 September 2012 – Initial Release. Derived from Mike Magatagan's Count Notes plugin.