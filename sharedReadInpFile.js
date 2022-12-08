// *********************************************************************
//
// D&B Direct+ utilities, shared functions for reading input data
// JavaScript code file: sharedReadInpFile.js
//
// Copyright 2022 Hans de Rooij
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//       http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
// either express or implied. See the License for the specific
// language governing permissions and limitations under the
// License.
//
// *********************************************************************

import * as path from 'path';
import { readFileSync } from 'fs';

function cleanDUNS(inDUNS) {
    //Correct the old school XX-XXX-XXXX DUNS format
    let outDUNS = inDUNS.length === 11 && inDUNS.slice(2, 3) === '-' && inDUNS.slice(6, 7) === '-'
        ? inDUNS.slice(0, 2) + inDUNS.slice(3, 6) + inDUNS.slice(7)
        : inDUNS;

    //Return an empty sting if more than nine or any non-numeric characters
    if(outDUNS.length > 9 || !/^\d*$/.test(outDUNS)) { return '' }

    //Return the DUNS with, if needed, 0s prepended
    return '000000000'.slice(0, 9 - outDUNS.length) + outDUNS;
}

function readInpFile(oFilePath, splitOn) {
    let arrIn = [];
 
    //Read the input file (synchronous)
    try {
       arrIn = readFileSync(path.format(oFilePath)).toString().split('\n')
    }
    catch(err) {
       console.log(err.message);
       return arrIn;
    }
 
    //Remove empty rows
    arrIn = arrIn.map(row => row.trim()).filter(row => !!row);
 
    //Split the row fields into columns
    if(splitOn) {
       arrIn = arrIn.map(row => row.split(splitOn))
    }
 
    //Split the rows into a header (arrIn) & input rows (arrRows)
    let arrRows = arrIn.splice(1);
 
    //Return an array of cleaned-up DUNS objects
    if(typeof arrIn[0] === 'string' && arrIn[0] === 'duns') {
       return arrRows.map(cleanDUNS).filter(sDUNS => !!sDUNS)
    }
 
    //Return an array of request objects
    return arrRows.map(row => {
       let oRet = {};
 
       row.forEach((criterium, idx) => oRet[arrIn[0][idx]] = criterium);
 
       return oRet;
    });
}

export { readInpFile };
