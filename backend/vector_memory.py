"""Cosine retrieval over local hashed text vectors; no external embedding service."""
import hashlib
import math
import re

DIMENSIONS=384

def embed(text):
    vector=[0.0]*DIMENSIONS
    words=re.findall(r'\w+',text.lower())
    for word in words:
        features=[word]+[word[i:i+3] for i in range(max(0,len(word)-2))]
        for feature in features:
            index=int.from_bytes(hashlib.blake2b(feature.encode(),digest_size=4).digest(),'big')%DIMENSIONS
            vector[index]+=1
    length=math.sqrt(sum(x*x for x in vector)) or 1
    return [x/length for x in vector]

def similarity(a,b):
    return sum(x*y for x,y in zip(a,b))
