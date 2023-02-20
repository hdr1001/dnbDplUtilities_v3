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
    const arrAddr = new Array(CTRY + 1);
 
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

//D&B data block registration number array to flat array conversion
function getArrRegNum(regNums, numRegNums) {
    const regNumProps = ['registrationNumber', 'typeDescription'];

    const fReduceRegNum = (arr, regNum) => arr.concat(regNumProps.map(prop => regNum[prop]));

    if(!regNums || !regNums.length) {
        return new Array(numRegNums * regNumProps.length)
    }

    let arrRegNum = regNums
        .sort((regNum1, regNum2) => regNum1.isPreferredRegistrationNumber && !regNum2.isPreferredRegistrationNumber ? -1 : 0)
        .slice(0, numRegNums)
        .reduce(fReduceRegNum, []);

    if(regNums.length < numRegNums) {
        arrRegNum = arrRegNum.concat(new Array((numRegNums - regNums.length) * regNumProps.length));
    }

    return arrRegNum;
}

//D&B data block Company Information number of employees array to flat array conversion
function getArrNumEmpl(numEmpls, arrInfoScope) { //Info scope can be 9066 'Individual', 9068 'HQ only' or 9067 'Consolidated'
    //Number of employee attributes to return
    const retAttr = ['value', 'reliabilityDescription', 'informationScopeDescription'];

    let numEmplsInfoScope = null;

    for(let i = 0; i < arrInfoScope.length; i++) {
        numEmplsInfoScope = numEmpls.filter(numEmpl => arrInfoScope[i] === numEmpl.informationScopeDnBCode);

        if(numEmplsInfoScope.length) {
            return retAttr.map(attr => numEmplsInfoScope[0][attr])
        }
    }

    return new Array(retAttr.length);
}

//D&B data block Company Information revenue array to flat array conversion
function getArrRevenue(financials, arrReliability) { //Reliability can be 9092 'Actual', 9094 'Modelled' or 9093 'Estimated'
    //Financials attributes to return
    const retAttr = [
        'unitCode',
        'reliabilityDescription',
        'informationScopeDescription',
        'financialStatementFromDate', //Not available but placeholder
        'financialStatementToDate'
    ];

    let finReliability = null;

    for(let i = 0; i < arrReliability.length; i++) {
        finReliability = financials.filter(rev => arrReliability[i] === rev.reliabilityDnBCode);

        if(finReliability.length) {
            const getValidFinRevElem = arrFins => {
                for(let j = 0; j < arrFins.length; j++) {
                    if(arrFins[j].yearlyRevenue && arrFins[j].yearlyRevenue.length) { return arrFins[j] }
                }

                return null;
            }

            const fin = getValidFinRevElem(finReliability);

            if(fin) {
                /* 
                const arrRevValues = new Array(3); //Local value and currency and USD value

                for(let j = 0; j < fin.yearlyRevenue.length; j++) {
                    if(fin.yearlyRevenue[j].currency === 'USD') {
                        arrRevValues[2] = fin.yearlyRevenue[j].value
                    }
                    else {
                        arrRevValues[0] = fin.yearlyRevenue[j].value
                        arrRevValues[1] = fin.yearlyRevenue[j].currency
                    }
                }

                return arrRevValues.concat(retAttr.map(attr => fin[attr]));
                */
                const arrRevValues = new Array(3); //Local revenue value, empty (total sales) and currency

                for(let j = 0; j < fin.yearlyRevenue.length; j++) {
                    if(fin.yearlyRevenue[j].currency === 'USD' && fin.yearlyRevenue[j].length > 1) {
                        continue
                    }
                    else {
                        arrRevValues[0] = fin.yearlyRevenue[j].value
                        arrRevValues[2] = fin.yearlyRevenue[j].currency
                    }
                }

                return arrRevValues.concat(retAttr.map(attr => fin[attr]));
            }
            else {
                //console.log(`Reliability code ${arrReliability[i]} available but contains no revenue figures`)
            }
        }
        else {
            //console.log(`Reliability code ${arrReliability[i]} not available`)
        }
    }

    return new Array(retAttr.length + 3);
}

//D&B data block Company Financials object to flat array conversion
function getLatestFin(latestFin) {
    const SALES_REV      = 0;
    const TOTAL_ASSETS   = 1;
    const CURRENCY       = 2;
    const UNITS          = 3;
    const RELIABILITY    = 4;
    const INFO_SCOPE     = 5;
    const STMT_FROM_DATE = 6;
    const STMT_TO_DATE   = 7;

    //Initialize the return array
    const arrRet = new Array(STMT_TO_DATE + 1);
 
    if(bIsEmptyObj(latestFin)) { return arrRet }

    arrRet[SALES_REV]      = latestFin?.overview?.salesRevenue;
    arrRet[TOTAL_ASSETS]   = latestFin?.overview?.totalAssets;
    arrRet[CURRENCY]       = latestFin?.currency;
    arrRet[UNITS]          = latestFin?.units;
    arrRet[RELIABILITY]    = latestFin?.reliability?.description;
    arrRet[INFO_SCOPE]     = latestFin?.informationScope?.description;
    arrRet[STMT_FROM_DATE] = latestFin?.financialStatementFromDate;
    arrRet[STMT_TO_DATE]   = latestFin?.financialStatementToDate;

    return arrRet;
}

//D&B data block Company Information get industry code for specific type
function getIndCode(indCodes, codeType) {
    if(!indCodes) { return null }

    const indCodesOfType = indCodes.filter(indCode => indCode.typeDnBCode === codeType);

    if(indCodesOfType.length === 0) {
        return null
    }

    return indCodesOfType.sort((elem1, elem2) => elem1 - elem2)[0].code
}

export { getArrAddr, getArrRegNum, getArrNumEmpl, getArrRevenue, getLatestFin, getIndCode };
