// *********************************************************************
//
// D&B Direct+ utilities, functions for flattening Direct+ objects
// JavaScript code file: sharedFlattenSplObj.js
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

//Check if an object is an empty object
function bIsEmptyObj(obj) {
    let bRet = false;

    try {
        if(obj === null || typeof obj === 'undefined' ||
                (obj.constructor === Object && Object.keys(obj).length === 0)) {
    
            bRet = true;
        }
    }
    catch(err) {
        console.log('Parameter passed into function bIsEmptyObj is not an object')
    }

    return bRet;
}

//D&B data block address object to array conversion
function getArrAddr(oAddr) {
    const ADDR1  = 0;
    const ADDR2  = 1;
    const PC     = 2;
    const CITY   = 3;
    const REGION = 4;
    const CTRY   = 5;

    //Initialize the return array
    let arrAddr = new Array(CTRY + 1);
 
    if(bIsEmptyObj(oAddr)) {return arrAddr}
 
    //Street address
    if(oAddr.streetAddress) {
        if(oAddr.streetAddress.line1) {arrAddr[ADDR1] = oAddr.streetAddress.line1}
        if(oAddr.streetAddress.line2) {arrAddr[ADDR2] = oAddr.streetAddress.line2}
    }
 
    //Refer to alternative properties if streetAddress doesn't contain info
    if(arrAddr[ADDR1] === null && arrAddr[ADDR2] === null) {
        if(oAddr.streetName) {
            arrAddr[ADDR1] = oAddr.streetName;

            if(oAddr.streetNumber) {
                arrAddr[ADDR1] += ' ' + oAddr.streetNumber
            }
        }
    }
 
    //Postalcode
    if(oAddr.postalCode) {arrAddr[PC] = oAddr.postalCode}

    //City
    if(!bIsEmptyObj(oAddr.addressLocality)) {
        arrAddr[CITY] = oAddr.addressLocality.name
    }

    //State, province or region
    if(!bIsEmptyObj(oAddr.addressRegion) && oAddr.addressRegion.abbreviatedName) {
        arrAddr[REGION] = oAddr.addressRegion.abbreviatedName
    }

    //Country
    if(oAddr.addressCountry && oAddr.addressCountry.isoAlpha2Code) {
        arrAddr[CTRY] = oAddr.addressCountry.isoAlpha2Code
    }
 
    return arrAddr;
}

export { getArrAddr };
