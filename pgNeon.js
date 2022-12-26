// *********************************************************************
//
// Code for testing data persistence using Neon (Serverless Postgres)
// JavaScript code file: pgNeon.js
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

import pg from 'pg';
const { Pool } = pg;

//Read the environment variables from the .env file
import * as dotenv from 'dotenv';
dotenv.config();

const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const pgPool = new Pool({
    host: PGHOST,
    database: PGDATABASE,
    user: PGUSER,
    password: PGPASSWORD,
    port: 5432,
    ssl: true,
    max: 10, // set pool max size to 5
    idleTimeoutMillis: 1000, // close idle clients after 1 second
    connectionTimeoutMillis: 1000, // return an error after 1 second if connection could not be established
    maxUses: 7500, // close (and replace) a connection after it has been used 7500 times
});

const SQL_TEST         = 0;
const SQL_DROP_TABLE   = 1;
const SQL_CREATE_TABLE = 2;
const SQL_INS_ROW      = 3;
const SQL_DEL_ROWS     = 4;

const sql = [
    'select version()',
    'DROP TABLE public.products_dnb',
    'CREATE TABLE public.products_dnb (duns character varying(9), dbs JSONB, dbs_obtained_at bigint, dbs_http_status smallint, CONSTRAINT products_dnb_pkey PRIMARY KEY (duns))',
    `INSERT INTO products_dnb (duns, dbs, dbs_obtained_at, dbs_http_status) VALUES ('123456789', '{"foo": "bar"}', null, 200)`,
    'DELETE FROM products_dnb'
];

function execSql(sSql) {
    pgPool.connect()
        .then(pgClient => {
            pgClient.query(sSql)
                .then(res => {
                    pgClient.release()
                    console.log(res.rows[0])
                })
                .catch(err => {
                    pgClient.release()
                    console.error('query error', err.message, err.stack)
                })
        })
}

execSql(sql[SQL_INS_ROW]);
