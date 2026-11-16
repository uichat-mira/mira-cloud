#!/usr/bin/env python3
"""Offline research checks only: draft JSON Schema + additional Mira business constraints.
No model/API calls. This is NOT a production validator or authorization mechanism.
"""
from __future__ import annotations
import json
from copy import deepcopy
from pathlib import Path
from jsonschema import Draft202012Validator

ROOT=Path(__file__).parent
SCHEMA=json.loads((ROOT/'mira-delegation-proposal-0.1.schema.json').read_text())
Draft202012Validator.check_schema(SCHEMA)
validator=Draft202012Validator(SCHEMA)

# In a production system these are provided by the host's request-specific trusted manifest.
HOST_KNOWN_REFS={'intent:1','artifact:verified-example'}
# Field name restrictions are a defense-in-depth example, NOT a true permission system.
FORBIDDEN_FIELD_KEYS={'accepted','acceptedcount','permissions','authorization','approve','grant','execute','send','delete','pay','runstatus','taskstatus'}
CADENCE_ALLOWED={'1h','24h','weekly'}

def inspect(payload: dict, *, allowed_refs=frozenset(HOST_KNOWN_REFS)) -> list[str]:
    faults=[]
    schema_errors=list(validator.iter_errors(payload))
    if schema_errors:
        return [f'schema: {e.message}' for e in schema_errors]
    for property_name in ('unknowns','assumptions','claims'):
        keys=[e['key'] for e in payload[property_name]]
        if len(keys)!=len(set(keys)):
            faults.append(f'duplicate {property_name} keys')
    stage_keys=[stage['key'] for stage in payload['stages']]
    if len(stage_keys)!=len(set(stage_keys)):
        faults.append('duplicate stage keys')
    for stage in payload['stages']:
        field_keys=[f['key'] for f in stage['fields']]
        if len(field_keys)!=len(set(field_keys)):
            faults.append(f'duplicate field keys in {stage["key"]}')
        for f in stage['fields']:
            k,kind,opts,v=f['key'],f['kind'],f['options'],f['suggestedValue']
            if k.lower().replace('-','') in FORBIDDEN_FIELD_KEYS:
                faults.append(f'reserved authority field key: {k}')
            opt_keys=[o['key'] for o in opts]
            if len(opt_keys)!=len(set(opt_keys)):
                faults.append(f'duplicate option keys: {k}')
            if kind=='choice' and (len(opts)<2 or not (v is None or isinstance(v,str) and v in opt_keys)):
                faults.append(f'invalid choice suggestions: {k}')
            elif kind=='boolean' and (opts or v is not None and not isinstance(v,bool)):
                faults.append(f'invalid boolean suggestions: {k}')
            elif kind=='text' and (opts or v is not None and not isinstance(v,str)):
                faults.append(f'invalid text suggestions: {k}')
            if k in ('frequency','cadence') and (kind!='choice' or any(o not in CADENCE_ALLOWED for o in opt_keys)):
                faults.append('unsupported cadence (<1h or unknown)')
    for cl in payload['claims']:
        for ref in cl['sourceRefs']:
            if ref not in allowed_refs:
                faults.append(f'unknown source reference: {ref}')
    # A sourceRef merely identifies material from the allowed manifest; it DOES NOT
    # verify the truth of the claimed text. The host must distinguish evidence and assertion.
    return faults

fixtures={p.stem:json.loads(p.read_text()) for p in sorted((ROOT/'fixtures').glob('*.json'))}
for name,payload in fixtures.items():
    errors=inspect(payload)
    assert not errors,(name,errors)
    print('VALID',name,'stages',len(payload['stages']))

radar=fixtures['long_running']
source=fixtures['review_rewrite']

cases=[]
def neg(name,base,transform):
    obj=deepcopy(base)
    transform(obj)
    cases.append((name,obj))

neg('spurious_authority_status',radar,lambda x:x.__setitem__('acceptedCount',3))
neg('duplicate_stage_keys',radar,lambda x:x['stages'][1].__setitem__('key','scope'))
neg('invalid_short_cadence',radar,lambda x:x['stages'][1]['fields'][0]['options'].append({'key':'15m','label':'每十五分钟'}))
neg('false_boolean_type',radar,lambda x:x['stages'][1]['fields'][1].__setitem__('suggestedValue','yes'))
neg('bad_choice_value',radar,lambda x:x['stages'][0]['fields'][0].__setitem__('suggestedValue','invented'))
neg('duplicate_option_ids',radar,lambda x:x['stages'][0]['fields'][0]['options'][1].__setitem__('key','products'))
neg('unauthorized_ref',source,lambda x:x['claims'][0].__setitem__('sourceRefs',['secret:unknown']))
neg('zero_stages',radar,lambda x:x.__setitem__('stages',[]))
neg('reserved_authority_field',radar,lambda x:x['stages'][1]['fields'][1].__setitem__('key','authorization'))
neg('arbitrary_js',radar,lambda x:x['stages'][0].__setitem__('script','alert(1)'))
for name,payload in cases:
    errors=inspect(payload)
    assert errors,f'expected rejection: {name}'
    print('REJECT',name,errors[0])
print(f'OK: {len(fixtures)} valid fixtures; {len(cases)} invalid fixtures rejected')
