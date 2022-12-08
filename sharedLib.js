// *********************************************************************
//
// D&B Direct+ utilities project shared library
// JavaScript code file: sharedLib.js
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

import * as https from 'https';

//Read the environment variables from the .env file
import * as dotenv from 'dotenv';
dotenv.config();

//Make sure to adhere to the D&B Direct+ rate limiting
import { RateLimiter } from 'limiter';
const dnbDplLimiter = new RateLimiter({ tokensPerInterval: 5, interval: 'second' });

const dnbDplHttpHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DNB_DPL_TOKEN}`
};

const dnbDplHttpAttr = {
    host: 'plus.dnb.com',
    method: 'GET',
    headers: dnbDplHttpHeaders
};

class Https {
    constructor(httpAttr) {
        this.httpAttr = httpAttr;
    }

    execReq() {
        return new Promise((resolve, reject) => {
            dnbDplLimiter.removeTokens(1).then(() => {
                const httpReq = https.request(this.httpAttr, resp => {
                    const chunks = [];
    
                    resp.on('error', err => reject(err));
    
                    resp.on('data', chunk => chunks.push(chunk));
    
                    resp.on('end', () => { //The data product is now available in full
                        const size = chunks.reduce((prev, curr) => prev + curr.length, 0);
    
                        resolve({
                            buffBody: Buffer.concat(chunks, size),
                            httpStatus: resp.statusCode
                        });
                    })
                })
    
                if(this.httpAttr.method === 'POST' && this.httpAttr.body) {
                    httpReq.write(this.httpAttr.body)
                }
    
                httpReq.end();
            })
        })
    }
}

export {
    dnbDplHttpAttr,
    Https
};
