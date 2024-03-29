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
import pg from 'pg';

//Read the environment variables from the .env file
import * as dotenv from 'dotenv';
dotenv.config();

// This function returns true if:
//  1. The value of the parameter is undefined of null
//  2. The parameter passed in is an object and has no (enumerable) properties
// An error will be thrown when the parameter passed in is not undefined, null
// or of type object. In all other cases false will be returned.
function objEmpty(obj) {
    if(obj === undefined || obj === null) { return true }

    if(obj && obj.constructor !== Object) {
        throw new Error('Only an object parameter is allowed when invoking function objEmpty')
    }

    if(Object.keys(obj).length === 0) { return true }

    return false;
}

//Make sure to adhere to the D&B Direct+ rate limiting
import { RateLimiter } from 'limiter';
const dnbDplLimiter = new RateLimiter({ tokensPerInterval: 4, interval: 'second' });

//Generic D&B Direct+ HTTP request attributes
const dnbDplHttpHeaders = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.DNB_DPL_TOKEN}`
};

const dnbDplHttpAttr = {
    host: 'plus.dnb.com',
    method: 'GET',
    headers: dnbDplHttpHeaders
};

//Class for executing HTTPS requests
class Https {
    constructor(httpAttr, limiter) {
        this.httpAttr = httpAttr;

        this.limiter = limiter ? limiter : dnbDplLimiter;
    }

    execReq() {
        return new Promise((resolve, reject) => {
            this.limiter.removeTokens(1).then(() => {
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

//Connect to the Neon serverless Postgres database
const { Pool } = pg;

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pgConn = {
    host: PGHOST,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: true,
    max: 10, // set pool max size to 10
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 9999, // return an error after 10 seconds if connection could not be established
    maxUses: 7500, // close (and replace) a connection after it has been used 7500 times
}

export {
    objEmpty,
    dnbDplHttpAttr,
    Https,
    Pool,
    pgConn
};
