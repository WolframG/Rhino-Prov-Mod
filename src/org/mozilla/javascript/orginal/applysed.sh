#!/bin/bash
for item in $* 
do
  cp $item $item.bak
  sed 's/'org.mozilla.javascript'/'org.mozilla.javascript.orginal'/g' $item.bak > $item
  rm $item.bak
done
