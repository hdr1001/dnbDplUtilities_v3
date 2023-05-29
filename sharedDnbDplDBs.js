// *********************************************************************
//
// D&B Direct+ shared code, data blocks object prototype
// JavaScript code file: sharedDnbDplDBs.js
//
// Copyright 2023 Hans de Rooij
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

import { objEmpty } from './sharedLib.js';
import { regNumTypeIsVAT, ecbNatIDs, ecbNatIDsDnbCodes, ecbLegalForms, ecbLegalFormsDnbCodes } from './sharedRefTables.js';

// Object to enable prototypal inheritance for D&B Direct+ Data Blocks
// Usage:
//    const oDnbDplDBs = Object.create(dnbDplDBs);
//
//    try{
//       oDnbDplDBs.init(jsonDnbDplDs);
//    }
//    catch(err) {
//       console.error(err);
//       ...
//    }
const dnbDplDBs = {
    // Implementation constants
    const: {
        addr: {
            type: {
                primary: {attr: 'primaryAddress', desc: 'Primary address'},
                registered: {attr: 'registeredAddress', desc: 'Registered address'},
                mailing: {attr: 'mailingAddress', desc: 'Mailing address'}
            },
            component: {
                line1: {idx: 0, desc: 'addr line 1'},
                line2: {idx: 1, desc: 'addr line 2'},
                postalcode: {idx: 2, desc: 'postalcode'},
                locality: {idx: 3, desc: 'city'},
                regionAbbr: {idx: 4, desc: 'region abbr'},
                regionName: {idx: 5, desc: 'region'},
                countryISO: {idx: 6, desc: 'country ISO'},
                countryName: {idx: 7, desc: 'country'}
            }
        },
        regNum: {
            component: { //Name components out of array ecbNatIDs "ecb..." and add ecb: true
                num: {attr: 'registrationNumber', desc: 'registration number'},
                type: {attr: 'typeDescription', desc: 'registration number type'},
                ecbType: {attr: 'type', desc: 'ECB registration number type', ecb: true},
                ecbName: {attr: 'isoCountry', desc: 'ECB ISO country code', ecb: true},
                ecbCountry: {attr: 'name', desc: 'ECB registration number name', ecb: true}
            }
        },
        indCodes: {
            type: {
                dnbIndCode: {code: 3599, desc: 'D&B Industry Code', descShort: 'D&B'},
                naics: {code: 30832, desc: 'NAICS Code', descShort: 'NAICS'},
                sic87: {code: 399, desc: 'US 1987 SIC Code', descShort: 'SIC'},
                naceRev2: {code: 29104, desc: 'NACE Revision 2', descShort: 'NACE'},
                hooversIndCode: {code: 25838, desc: 'D&B Hoovers Industry Code', descShort: 'Hoovers'},
                majorIndCat: {code: 24657, desc: 'Major Industry Category', descShort: 'major'}
            },
            component: {
                code: {attr: 'code', desc: 'activity code'},
                desc: {attr: 'description', desc: 'act code description'}
            }
        },
        numEmpl: {
            reliabilityCodes: [
                {code: 9092, prio: 1, desc: 'actual'},
                {code: 9094, prio: 2, desc: 'modelled'},
                {code: 9093, prio: 3, desc: 'estimated'}
            ],
            scopeCodes: [
                {code: 9066, prio: 1, desc: 'individual'},
                {code: 9068, prio: 2, desc: 'HQ only'},
                {code: 9067, prio: 3, desc: 'consolidated'}
            ],
            component: {
                value: {attr: 'value', desc: 'number of employees'},
                scope: {attr: 'informationScopeDescription', desc: 'information scope'},
                reliability: {attr: 'reliabilityDescription', desc: 'reliability'}
            }
        },
        corpLinkage: {
            oneLevelUp: 0,
            domUlt: 1,
            gblUlt: 2
        }
    },

    //Object create will create an object instance with the correct prototype
    //Invoke method init to initiate the object instance properties (example above)
    init: function(jsonDnbDplDBs) {
        try {
            this.dbs = JSON.parse(jsonDnbDplDBs)
        }
        catch(err) {
            this.err = err.message;

            throw new Error('Error parsing D&B Direct+ data blocks JSON');
        }

        this.org = this.dbs.organization || null;

        if(!this.org) {
            this.err = this.dbs.error || null

            throw new Error('D&B Direct+ data blocks JSON contains an error');
        }

        if(this.org.registrationNumbers && this.org.registrationNumbers.length) {
            this.org.registrationNumbers.forEach(regNum => {
                if(regNum.typeDnBCode && regNumTypeIsVAT.has(regNum.typeDnBCode)) {
                    regNum.vat = true
                }
            })
        }

        //Simple one to one mappings 
        this.map121 = {
            // inquiry detail
            inqDuns: {path: this.dbs.inquiryDetail?.duns, desc: 'inquiry DUNS'},
            tradeUp: {path: this.dbs.inquiryDetail?.tradeUp, desc: 'trade up'},
            custRef: {path: this.dbs.inquiryDetail?.customerReference, desc: 'customer reference'},

            // Common data-elements
            duns: {path: this.org?.duns, desc: 'DUNS'},
            primaryName: {path: this.org?.primaryName, desc: 'name'},
            countryISO: {path: this.org?.countryISOAlpha2Code, desc: 'country ISO'},

            // Company information data-elements
            registeredName: {path: this.org?.registeredName, desc: 'registered name'},
            opStatus: {path: this.org?.dunsControlStatus?.operatingStatus?.description, desc: 'operating status'},
            startDate: {path: this.org?.startDate, desc: 'start date'},
            busEntityType: {path: this.org?.businessEntityType?.description, desc: 'entity type'},
            SMB: {path: this.org?.organizationSizeCategory?.description, desc: 'entity size'},
            defaultCurr: {path: this.org?.defaultCurrency, desc: 'default currency'},
        }
    },

    // This function will convert the blockIDs array
    // "inquiryDetail": {
    //     "orderReason": "???",
    //     "duns": "???",
    //     "blockIDs": [
    //         "companyinfo_L2_v1",
    //         "principalscontacts_L3_v2",
    //         "hierarchyconnections_L1_v1"
    //     ],
    //     "tradeUp": "hq"
    // },
    //
    // to 
    // {
    //    companyinfo: { level: 2, version: 1 },
    //    principalscontacts: { level: 3, version: 2 },
    //    hierarchyconnections: { level: 1, version: 1 }
    // }
    blockIDsToObj: function() {
        return this.dbs.inquiryDetail.blockIDs.reduce((obj, blockID) => {
            const arrBlockID = blockID.split('_');

            obj[arrBlockID[0]] = {
                level: parseInt(arrBlockID[1].slice(1 - arrBlockID[1].length)),
                version: parseInt(arrBlockID[2].slice(1 - arrBlockID[2].length))
            };

            return obj;
        }, {})
    },

    // This function will get the transaction timestamp in the format YYYYMMDD
    transactionTimestamp: function() {
        const tts = this.dbs.transactionDetail?.transactionTimestamp;

        let ret = '';

        if(tts) {
            const dateTts = new Date(tts);

            if(!isNaN(dateTts)) {
                ret = dateTts.toISOString().slice(0,10).replace(/-/g,"")
            }
        }

        return ret;
    },

    // This function will convert a D&B Direct+ address (primary, registered, ...)
    // to an array
    // Supported address types, see addr.type
    // Supported address components, see addr.component
    addrToArray: function(addrType, arrAddrComponents, header) {
        //Initialize the return array
        const retArr = new Array(arrAddrComponents.length);

        let dplAdr;
        
        if(!header) {
            dplAdr = this.org[addrType.attr]; //Get object ref to the address

            if(objEmpty(dplAdr)) { return retArr }
        }

        arrAddrComponents.forEach((addrComponent, idx) => {
            switch(addrComponent.idx) {
                case dnbDplDBs.const.addr.component.line1.idx:
                    if(header) {
                        retArr[idx] = dnbDplDBs.const.addr.component.line1.desc;
                    }
                    else {
                        retArr[idx] = dplAdr?.streetAddress?.line1;

                        if(!retArr[idx]) {
                            if(dplAdr?.streetName) {
                                retArr[idx] = dplAdr.streetName
                            }
    
                            if(dplAdr?.streetNumber) {
                                if(retArr[idx].length) {
                                    retArr[idx] += ' ' + dplAdr.streetNumber
                                }
                                else {
                                    retArr[idx] = dplAdr.streetNumber
                                }
                            }
                        }
                    }

                    break;
                
                case dnbDplDBs.const.addr.component.line2.idx:
                    retArr[idx] = header
                        ? dnbDplDBs.const.addr.component.line2.desc
                        : dplAdr?.streetAddress?.line2;
                    break;
                
                case dnbDplDBs.const.addr.component.locality.idx:
                    retArr[idx] = header 
                        ? dnbDplDBs.const.addr.component.locality.desc
                        : dplAdr?.addressLocality?.name;
                    break;
                
                case dnbDplDBs.const.addr.component.postalcode.idx:
                    retArr[idx] = header
                        ? dnbDplDBs.const.addr.component.postalcode.desc
                        : dplAdr?.postalCode;
                    break;
                
                case dnbDplDBs.const.addr.component.regionAbbr.idx:
                    retArr[idx] = header
                        ? dnbDplDBs.const.addr.component.regionAbbr.desc
                        : dplAdr?.addressRegion?.abbreviatedName;
                    break;
                
                case dnbDplDBs.const.addr.component.regionName.idx:
                    retArr[idx] = header
                        ? dnbDplDBs.const.addr.component.regionName.desc
                        : dplAdr?.addressRegion?.name;
                    break;
                
                case dnbDplDBs.const.addr.component.countryISO.idx:
                    retArr[idx] = header ?
                        dnbDplDBs.const.addr.component.countryISO.desc
                        : dplAdr?.addressCountry?.isoAlpha2Code;
                    break;
                
                case dnbDplDBs.const.addr.component.countryName.idx:
                    retArr[idx] = header
                        ? dnbDplDBs.const.addr.component.countryName.desc
                        : dplAdr?.addressCountry?.name;
                    break;                
            }
        });

        return retArr;
    },

    // This function will convert D&B Direct+ registration numbers
    // to an array of a certain length
    // Supported registration number components, see regNum.component
    regNumsToArray: function(regNumComponents, numRegNums, header) {
        //Are any components from the ecbNatIDs requested?
        const bEcb = !!regNumComponents.filter(component => component.ecb).length;

        //If ECB components requested add the required references
        if(bEcb) {
            this.org.registrationNumbers.forEach(regNum => {
                const arrEcbNatIDsDnbCodes = ecbNatIDsDnbCodes.filter(ecbNatIDsDnbCode => ecbNatIDsDnbCode.dnbCode === regNum.typeDnBCode);

                if(arrEcbNatIDsDnbCodes.length) {
                    const arrEcbNatIDs = ecbNatIDs.filter(ecbNatID => ecbNatID.type === arrEcbNatIDsDnbCodes[0].ecbType);
    
                    if(arrEcbNatIDs.length) {
                        regNum.ecbNatID = arrEcbNatIDs[0]
                    }
                }
/*
                else {
                    console.error(`Please map registration number type ${regNum.typeDnBCode}`)
                }
*/   
            })
        }

        //Create an empty return array
        let retArr = new Array(numRegNums * regNumComponents.length);

        //If header requsted, return the component descriptions
        if(header) {
            for(let i = 0; i < numRegNums; i++) {
                regNumComponents.forEach((regNumComponent, idx) => {
                    retArr[i * regNumComponents.length + idx] = `${regNumComponent.desc}${numRegNums > 1 ? ' ' + (i + 1) : ''}` 
                })
            }

            return retArr;
        }

        //No content available
        if(!this.org.registrationNumbers || !this.org.registrationNumbers.length) { return retArr }

        let iRegNum = 0, regNums;

        //If ECB components requested, give preference to mapped registration numbers
        if(bEcb) {
            const ecbNatIDs = this.org.registrationNumbers
                .filter(regNum => regNum.ecbNatID)
                .sort((regNum1, regNum2) => regNum1.ecbNatID.rank - regNum2.ecbNatID.rank)
                .slice(0, numRegNums);
                
            ecbNatIDs.forEach(regNum => {
                if(new RegExp(regNum.ecbNatID.regExp).test(regNum.registrationNumber)) {
                    //console.log(`➡️  registration number ${regNum.registrationNumber} tests ✅`)
                }
                else {
                    console.log(`➡️  registration number ${regNum.registrationNumber} tests ❌`)
                }
            });
            
            for(iRegNum = 0; iRegNum < ecbNatIDs.length; iRegNum++) {
                regNumComponents.forEach((regNumComponent, idx) => {
                    retArr[iRegNum * regNumComponents.length + idx] =
                        regNumComponent.ecb
                            ? ecbNatIDs[iRegNum].ecbNatID[regNumComponent.attr]
                            : ecbNatIDs[iRegNum][regNumComponent.attr]
                }
            )}

            if(iRegNum === numRegNums) { return retArr }

            regNums = this.org.registrationNumbers.filter(regNum => !regNum.ecbNatID);
        }
        else {
            regNums = this.org.registrationNumbers
        }

        const regNumsPrioritized = regNums
            .sort((regNum1, regNum2) => regNum1.vat && !regNum2.vat ? -1 : 0)
            .sort((regNum1, regNum2) => regNum1.isPreferredRegistrationNumber && !regNum2.isPreferredRegistrationNumber ? -1 : 0)
            .slice(0, numRegNums - iRegNum);

        for(let iRegNumPrio = 0; iRegNumPrio < regNumsPrioritized.length; iRegNumPrio++) {
            regNumComponents.forEach((regNumComponent, idx) => {
                retArr[(iRegNum + iRegNumPrio) * regNumComponents.length + idx] = regNumsPrioritized[iRegNumPrio][regNumComponent.attr]
            }
        )}
        
        return retArr;
    },

    // This function will convert D&B Direct+ industry code objects to an
    // array of a certain length
    // Supported industry type codes, see indCodes.type
    // Supported industry code components, see indCodes.component
    indCodesToArray: function(indTypeCode, arrIndCodeComponents, numIndCodes, header) {
        let retArr = new Array(numIndCodes * arrIndCodeComponents.length);

        if(header) {
            for(let i = 0; i < numIndCodes; i++) {
                arrIndCodeComponents.forEach((component, idx) => {
                    retArr[i * arrIndCodeComponents.length + idx] = `${component.desc} ${i + 1} (${indTypeCode.descShort})`
                })
            }

            return retArr;
        }

        if(!this.org.industryCodes || !this.org.industryCodes.length) { return retArr }

        retArr = this.org.industryCodes
            .filter(indCode => indCode.typeDnBCode === indTypeCode.code)
            .sort((indCode1, indCode2) => indCode1.priority - indCode2.priority)
            .slice(0, numIndCodes)
            .reduce((arr, indCode) => arr.concat(arrIndCodeComponents.map(component => indCode[component.attr])), []);

        if(numIndCodes * arrIndCodeComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numIndCodes * arrIndCodeComponents.length - retArr.length)));
        }

        return retArr;
    },

    // This function will convert D&B Direct+ figures related to employees
    // counts to an array of a certain length
    // Supported number of employees reliability info, see numEmpl.reliability
    // Supported number of employees information scopes, see numEmpl.scope
    // Supported number of employees components, see numEmpl.component
    numEmplsToArray: function(arrNumEmplComponents, numNumEmpl, header) {
        const sortNumEmpl = function(obj1, obj2) {
            if(obj1 === undefined) {
                if(obj2 === undefined) { //both objects undefined, do nothing
                    return 0
                }
                else { //solely obj1 undefined, move up obj2
                    return 1
                }
            }

            if(obj2 === undefined) { //solely obj2 undefined, leave it behind obj1
                return -1
            }

            const prioDiff = obj1.prio - obj2.prio;

            if(prioDiff === 0) { //return null in case there is no priority difference
                return null
            }

            return prioDiff;
        }

        let retArr = new Array(numNumEmpl * arrNumEmplComponents.length);

        if(header) {
            for(let i = 0; i < numNumEmpl; i++) {
                arrNumEmplComponents.forEach((component, idx) => {
                    retArr[i * arrNumEmplComponents.length + idx] = `${component.desc} ${i + 1}`
                })
            }

            return retArr;
        }

        if(!this.org.numberOfEmployees || !this.org.numberOfEmployees.length) { return retArr }

        retArr = this.org.numberOfEmployees
            .sort((numEmpl1, numEmpl2) => {
                const numEmplConst = dnbDplDBs.const.numEmpl;

                let numEmplSorted;

                numEmplSorted = sortNumEmpl( //Bubble up actual v. modelled v. estimated
                        numEmplConst.reliabilityCodes.find(reliability => reliability.code === numEmpl1.reliabilityDnBCode),
                        numEmplConst.reliabilityCodes.find(reliability => reliability.code === numEmpl2.reliabilityDnBCode)
                    );

                if(typeof numEmplSorted === 'number') { return numEmplSorted }

                numEmplSorted = sortNumEmpl( //if reliability the same, bubble up individual v. hq v. consolidated
                    numEmplConst.scopeCodes.find(scope => scope.code === numEmpl1.informationScopeDnBCode),
                    numEmplConst.scopeCodes.find(scope => scope.code === numEmpl2.informationScopeDnBCode)
                )

                if(typeof numEmplSorted === 'number') { return numEmplSorted }

                return 0;
            })
            .slice(0, numNumEmpl)
            .reduce((arr, numEmpl) => arr.concat(arrNumEmplComponents.map(component => numEmpl[component.attr])), []);

        if(numNumEmpl * arrNumEmplComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numNumEmpl * arrNumEmplComponents.length - retArr.length)));
        }

        return retArr;
    },

    // This function will give access to the three levels of linkage available in hierarchies & connections level 1
    // Because only an HQ or a parent is included there are three levels, see corpLinkage constants above
    corpLinkage: function() {
        const corpLinkage = this.org?.corporateLinkage;

        const ret = [ null, null, null ];

        if(objEmpty(corpLinkage)) { return ret }

        //Fill out position oneLevelUp in the array
        if(!objEmpty(corpLinkage?.headQuarter)) {
            corpLinkage.headQuarter.hq = true;
            ret[this.const.corpLinkage.oneLevelUp] = corpLinkage.headQuarter;
        }
        else if(!objEmpty(corpLinkage?.parent)) {
            ret[this.const.corpLinkage.oneLevelUp] = corpLinkage.parent;
        }

        //Fill out position domUlt in the array
        if(!objEmpty(corpLinkage?.domesticUltimate)) {
            ret[this.const.corpLinkage.domUlt] = corpLinkage.domesticUltimate;
        }
        
        //Fill out position gblUlt in the array
        if(!objEmpty(corpLinkage?.globalUltimate)) {
            ret[this.const.corpLinkage.gblUlt] = corpLinkage.globalUltimate;
        }

        return ret;
    },

    // This function will convert D&B Direct+ legal form codes (ref table 4) to corresponding ECB codes
    getEcbLegalForm: function() {
        const dnbCode = this.org?.registeredDetails?.legalForm?.dnbCode;

        if(dnbCode) {
            const arrEcbLegalFormsDnbCodes = ecbLegalFormsDnbCodes.filter(ecbLegalFormsDnbCode => ecbLegalFormsDnbCode.dnbCode === dnbCode);

            if(arrEcbLegalFormsDnbCodes.length) {
                const arrEcbLegalForms = ecbLegalForms.filter(ecbLegalForm => ecbLegalForm.ecbLegalFormCode === arrEcbLegalFormsDnbCodes[0].ecbLegalFormCode);

                if(arrEcbLegalForms) { return arrEcbLegalForms[0] }
            }
        }
/*
        if(dnbCode === undefined) {
            console.error(`No legal form code available for ${this.org.duns} ${this.org.primaryName} (${this.org.countryISOAlpha2Code})`)
        }
        else {
            console.error(`Legal form code ${dnbCode} not mapped`)
        }
*/
        return null;
    }
};

export { dnbDplDBs };
