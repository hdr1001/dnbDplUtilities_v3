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

class Header {
    constructor(text, idx, pre, post) {
        this.text = text;
        this.idx = idx;
        this.pre = pre;
        this.post = post;
    }

    toString() {
        let ret = this.text;

        if(this.pre) { ret += this.pre + ' '}
        if(this.post) { ret += ' ' + this.post}

        if(this.idx || this.idx === 0) { ret += ' ' + this.idx}

        return ret;
    }
}

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
            scopeCodes: {
                individual: {code: 9066, prio: 1, desc: 'individual'},
                hq: {code: 9068, prio: 2, desc: 'HQ only'},
                consolidated: {code: 9067, prio: 3, desc: 'consolidated'}
            },
            component: {
                value: {attr: 'value', desc: 'number of employees'},
                scope: {attr: 'informationScopeDescription', desc: 'information scope'},
                reliability: {attr: 'reliabilityDescription', desc: 'reliability'}
            }
        },
        corpLinkage: {
            level: {
                oneLevelUp: 0,
                domUlt: 1,
                gblUlt: 2
            },
            component: {
                duns: {idx: 0, desc: 'duns'},
                name: {idx: 1, desc: 'name'}
            }
        },
        reliability: {
            min: {code: 11078, desc: 'minimum value from range'},
            rounded: {code: 11147, desc: 'rounded'},
            derived: {code: 11176, desc: 'derived'},
            final: {code: 16970, desc: 'final'},
            projected: {code: 192, desc: 'projected'},
            average: {code: 25100, desc: 'average'},
            assigned: {code: 33392, desc: 'assigned'},
            actual: {code: 9092, desc: 'actual'},
            estimated: {code: 9093, desc: 'estimated'},
            modelled: {code: 9094, desc: 'modelled'}
        },
        infoScope: {
            group: {code: 13173, desc: 'group'},
            emplTotal: {code: 36429, desc: 'employees total'},
            emplHere: {code: 36430, desc: 'employees here'},
            individual: {code: 9066, desc: 'individual'},
            consolidated: {code: 9067, desc: 'consolidated'},
            hq: {code: 9068, desc: 'HQ only'}
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
            opStatusDate: {path: this.org?.dunsControlStatus?.operatingStatus?.startDate, desc: 'operating status date'},
            opSubStatus: {path: this.org?.dunsControlStatus?.operatingSubStatus?.description, desc: 'operating substatus'},
            startDate: {path: this.org?.startDate, desc: 'start date'},
            busEntityType: {path: this.org?.businessEntityType?.description, desc: 'entity type'},
            legalFormCode4: {path: this.org?.registeredDetails?.legalForm?.dnbCode, desc: 'code legal form detailed'},
            legalFormDesc4: {path: this.org?.registeredDetails?.legalForm?.description, desc: 'legal form detailed'},
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
    addrToArray: function(addr, arrAddrComponents, header) {
        //Initialize the return array
        const retArr = new Array(arrAddrComponents.length);

        if(!header) {
            if(objEmpty(addr)) { return retArr }
        }

        arrAddrComponents.forEach((addrComponent, idx) => {
            switch(addrComponent.idx) {
                case this.const.addr.component.line1.idx:
                    if(header) {
                        retArr[idx] = new Header(this.const.addr.component.line1.desc)
                    }
                    else {
                        retArr[idx] = addr?.streetAddress?.line1;

                        if(!retArr[idx]) {
                            if(addr?.streetName) {
                                retArr[idx] = addr.streetName
                            }
    
                            if(addr?.streetNumber) {
                                if(retArr[idx].length) {
                                    retArr[idx] += ' ' + addr.streetNumber
                                }
                                else {
                                    retArr[idx] = addr.streetNumber
                                }
                            }
                        }
                    }

                    break;
                
                case this.const.addr.component.line2.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.line2.desc)
                        : addr?.streetAddress?.line2;
                    break;
                
                case this.const.addr.component.locality.idx:
                    retArr[idx] = header 
                        ? new Header(this.const.addr.component.locality.desc)
                        : addr?.addressLocality?.name;
                    break;
                
                case this.const.addr.component.postalcode.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.postalcode.desc)
                        : addr?.postalCode;
                    break;
                
                case this.const.addr.component.regionAbbr.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.regionAbbr.desc)
                        : addr?.addressRegion?.abbreviatedName;
                    break;
                
                case this.const.addr.component.regionName.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.regionName.desc)
                        : addr?.addressRegion?.name;
                    break;
                
                case this.const.addr.component.countryISO.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.countryISO.desc)
                        : addr?.addressCountry?.isoAlpha2Code;
                    break;
                
                case this.const.addr.component.countryName.idx:
                    retArr[idx] = header
                        ? new Header(this.const.addr.component.countryName.desc)
                        : addr?.addressCountry?.name;
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
                    retArr[i * regNumComponents.length + idx] = new Header(regNumComponent.desc, numRegNums > 1 ? i + 1 : null) 
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
                    retArr[i * arrIndCodeComponents.length + idx] = new Header(component.desc, numIndCodes > 1 ? i + 1 : null, '', '(' + indTypeCode.descShort + ')')
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
    numEmplsToArray: function(arrNumEmplComponents, arrNumEmplScope, numNumEmpl, header) {
        let retArr = new Array(numNumEmpl * arrNumEmplComponents.length);

        if(header) {
            for(let i = 0; i < numNumEmpl; i++) {
                arrNumEmplComponents.forEach((component, idx) => {
                    retArr[i * arrNumEmplComponents.length + idx] = new Header(component.desc, numNumEmpl > 1 ? i + 1 : null)
                })
            }

            return retArr;
        }

        if(!this.org.numberOfEmployees || !this.org.numberOfEmployees.length) { return retArr }

        const arrPrios = [
            {
                attr: 'informationScopeDnBCode',
                prios: [
                    { ...this.const.infoScope.individual, prio: 1 },
                    { ...this.const.infoScope.hq, prio: 2 },
                    { ...this.const.infoScope.consolidated, prio: 3 }
                ]
            }, {
                attr: 'reliabilityDnBCode',
                prios: [
                    { ...this.const.reliability.actual, prio: 1 },
                    { ...this.const.reliability.modelled, prio: 2 },
                    { ...this.const.reliability.estimated, prio: 3 }
                ]
            }
        ];

        if(arrNumEmplScope.length) {
            retArr = this.org.numberOfEmployees
                .filter(numEmpl => arrNumEmplScope.findIndex(numEmplScope => numEmplScope === numEmpl.informationScopeDnBCode) > -1)
        }
        else {
            retArr = this.org.numberOfEmployees
        }

        retArr = retArr
            .sort((numEmpl1, numEmpl2) => {
                function sortNumEmpl(idx) {
                    const prio1 = arrPrios[idx].prios.find(prio => prio.code === numEmpl1[arrPrios[idx].attr]);
                    const prio2 = arrPrios[idx].prios.find(prio => prio.code === numEmpl2[arrPrios[idx].attr]);

                    if(prio1 === undefined && prio1 === undefined) {
                        if(++idx < arrPrios.length) {
                            return sortNumEmpl(idx)
                        }
                        else { return 0 }
                    }

                    if(prio1 === undefined) { return 1 }

                    if(prio2 === undefined) { return -1 }

                    const prioDiff = prio1.prio - prio2.prio;

                    if(prioDiff === 0 && ++idx < arrPrios.length) {
                        return sortNumEmpl(idx)
                    }
                    else {
                        return prioDiff
                    }
                }

                return sortNumEmpl(0);
            })
            .slice(0, numNumEmpl)
            .reduce((arr, numEmpl) => arr.concat(arrNumEmplComponents.map(component => numEmpl[component.attr])), []);

        if(numNumEmpl * arrNumEmplComponents.length - retArr.length > 0) {
            retArr = retArr.concat(new Array((numNumEmpl * arrNumEmplComponents.length - retArr.length)));
        }

        return retArr;
    },

    // This function will convert the latest financial figures to an array
    latestFinsToArray: function(header) {
        const sales_rev      = 0;
        const total_assets   = 1;
        const currency       = 2;
        const units          = 3;
        const reliability    = 4;
        const info_scope     = 5;
        const stmt_from_date = 6;
        const stmt_to_date   = 7;

        let retArr = new Array(stmt_to_date + 1);

        if(header) {
            retArr[sales_rev] = new Header('sales rev');
            retArr[total_assets] = new Header('total assets');
            retArr[currency] = new Header('currency');
            retArr[units] = new Header('units');
            retArr[reliability] = new Header('reliability');
            retArr[info_scope] = new Header('info scope');
            retArr[stmt_from_date] = new Header('stmt from date');
            retArr[stmt_to_date] = new Header('stmt to date');

            return retArr;
        }

        // Financial data from company financials
        const latestFins = this.org?.latestFinancials;

        if(!objEmpty(latestFins)) {
            retArr[sales_rev]      = latestFins?.overview?.salesRevenue;
            retArr[total_assets]   = latestFins?.overview?.totalAssets;
            retArr[currency]       = latestFins?.currency;
            retArr[units]          = latestFins?.units;
            retArr[reliability]    = latestFins?.reliability?.description;
            retArr[info_scope]     = latestFins?.informationScope?.description;
            retArr[stmt_from_date] = latestFins?.financialStatementFromDate;
            retArr[stmt_to_date]   = latestFins?.financialStatementToDate;
    
            if(retArr[currency]) { return retArr }
        }

        // No currency available, revert to modelled/estimated values from company information
        let ciFinancials = this.org?.financials || [];

        if(ciFinancials.length === 0) { return retArr }

        // Add prio to the modelled/estimated values
        const arrReliability = [ 
            {
                ...this.const.reliability.modelled,
                prio: 1
            }, {
                ...this.const.reliability.estimated,
                prio: 2
            }
        ];

        ciFinancials = ciFinancials
            .map(fin => {
                const idxReliability = arrReliability.findIndex(infoScope => infoScope.code === fin.reliabilityDnBCode);

                if(idxReliability > -1) {
                    fin.reliability = arrReliability[idxReliability]
                }

                return fin;
            })
            .sort((fin1, fin2) => {
                //Bubble the high years to the top of the array
                let year1 = 0;
                let year2 = 0;

                if(fin1.financialStatementToDate) {
                    year1 = parseInt(fin1.financialStatementToDate.slice(0, 4));

                    if(isNaN(year1)) {
                        year1 = 0
                    }
                }

                if(fin2.financialStatementToDate) {
                    year2 = parseInt(fin2.financialStatementToDate.slice(0, 4));

                    if(isNaN(year2)) {
                        year2 = 0
                    }
                }

                if(year1 && !year2) { return -1 }

                if(!year1 && year2) { return 1 }

                if(year1 && year2) {
                    if(year1 - year2 !== 0) { return year2 - year1 }
                }

                //Both years not a number or equal then prefer modelled
                if(!fin1.reliability && fin2.reliability) { return  -1 }

                if(fin1.reliability && !fin2.reliability) { return  1 }

                if(fin1.reliability && fin2.reliability) {
                    if(fin1.reliability.prio - fin2.reliability.prio !== 0) {
                        return fin1.reliability.prio - fin2.reliability.prio
                    }
                }

                return 0;
            })

        let arrYearlyRev = ciFinancials[0].yearlyRevenue || [], yearlyRev = null;

        if(arrYearlyRev.length === 1) {
            yearlyRev = arrYearlyRev[0];
        }
        else if(arrYearlyRev.length > 1) {
            arrYearlyRev = arrYearlyRev.filter(rev => rev.currency !== 'USD'); //Preference for local currency

            if(arrYearlyRev.length) { yearlyRev = arrYearlyRev[0] }
        }

        retArr[sales_rev]      = yearlyRev && yearlyRev.value;
        retArr[total_assets]   = null;
        retArr[currency]       = yearlyRev && yearlyRev.currency;
        retArr[units]          = ciFinancials[0]?.unitCode;
        retArr[reliability]    = ciFinancials[0]?.reliabilityDescription;
        retArr[info_scope]     = ciFinancials[0]?.informationScopeDescription;
        retArr[stmt_from_date] = null;
        retArr[stmt_to_date]   = ciFinancials[0]?.financialStatementToDate;

        return retArr;
    },

    // This function will return true if the duns requested is the global ultimate duns, false if the duns requested
    // is not the global ultimate and undefined if no linkage information is available
    isGlobalUlt: function() {
        let ret;

        if(objEmpty(this.org?.corporateLinkage)) { return ret }

        if(this.org.corporateLinkage.familytreeRolesPlayed.find(role => role.dnbCode === 12775)) {
            ret = true
        }
        else {
            ret = false
        }

        return ret;
    },

    // This function will give access to the three levels of linkage available in hierarchies & connections level 1
    // Because only an HQ or a parent is included there are three levels, see corpLinkage constants above
    corpLinkageLevels: function() {
        const corpLinkage = this.org?.corporateLinkage;

        const ret = [ null, null, null ]; 

        if(objEmpty(corpLinkage)) { return ret }

        //Fill out position oneLevelUp in the array
        if(!objEmpty(corpLinkage?.headQuarter)) {
            corpLinkage.oneLevelUp = 'headQuarter';

            ret[this.const.corpLinkage.level.oneLevelUp] = corpLinkage.headQuarter;
        }
        else if(!objEmpty(corpLinkage?.parent)) {
            corpLinkage.oneLevelUp = 'parent';

            ret[this.const.corpLinkage.level.oneLevelUp] = corpLinkage.parent;
        }

        //Fill out position domUlt in the array
        if(!objEmpty(corpLinkage?.domesticUltimate)) {
            ret[this.const.corpLinkage.level.domUlt] = corpLinkage.domesticUltimate;
        }
        
        //Fill out position gblUlt in the array
        if(!objEmpty(corpLinkage?.globalUltimate)) {
            ret[this.const.corpLinkage.level.gblUlt] = corpLinkage.globalUltimate;
        }

        return ret;
    },

    // Convert one corporate linkage level to an array
    corpLinkageLevelToArray: function(linkageLevel, arrLinkageLevelComponents, arrLinkageLevelAddrComponents, header) {
        let retArr = new Array(arrLinkageLevelComponents.length);

        if(!header) {
            if(objEmpty(linkageLevel)) { return retArr }
        }

        arrLinkageLevelComponents.forEach((linkageLevelComponent, idx) => {
            switch(linkageLevelComponent.idx) {
                case this.const.corpLinkage.component.duns.idx:
                    retArr[idx] = header
                        ? new Header(this.const.corpLinkage.component.duns.desc)
                        : linkageLevel?.duns;
                    break;
                case this.const.corpLinkage.component.name.idx:
                    retArr[idx] = header
                        ? new Header(this.const.corpLinkage.component.name.desc)
                        : linkageLevel?.primaryName;
                    break;
            }
        });

        if(Array.isArray(arrLinkageLevelAddrComponents)) {
        }

        return retArr;
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

export { Header, dnbDplDBs };
