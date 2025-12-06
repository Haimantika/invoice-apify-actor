#!/bin/bash

# Script to run the Apify actor locally with proper input file
# This copies the example input to the storage directory where Apify SDK expects it

mkdir -p storage/key_value_stores/default
cp INPUT.example.json storage/key_value_stores/default/INPUT.json
apify run
