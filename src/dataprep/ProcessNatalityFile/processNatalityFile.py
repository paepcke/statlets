'''
Created on Aug 19, 2016

@author: paepcke
'''
import csv
import json

class NatalityFileProcessor(object):
    '''
    Ingests CDC natality file (http://wonder.cdc.gov/natality-current.html).
    Expects CSV format: 
    
        'Notes', 'State', 'State Code', 'Age of Mother', 'Age of Mother Code', 'Births'
        
    where "age of mother" is either "Under 15 years" or "15-19 years".
    Adds numbers for both age groups in a given state. 
    Outputs JSON: {<state> : <numTeenBirths>}
    '''
    def __init__(self, teenBirthFilePath, totalBirthsFilePath, outFile=None):
        
        
        teenBirthsDict = {}
        NOTES  = 0;
        STATE  = 1;
        BIRTHS = 5;

        # For total teenBirthsFd by state:
        totalBirthsDict = self.makeTotalBirthsDict(totalBirthsFilePath)

        with open(teenBirthFilePath, 'r') as teenBirthsFd:
            csvReader = csv.reader(teenBirthsFd, delimiter='\t')
            # Swallow the header:
            csvReader.next();
            for line in csvReader:
                if len(line[NOTES]) == 0:
                    state = line[STATE]
                    # Combine mother-under-15 and mother-15-19:
                    try:
                        teenBirthsDict[state] += int(line[BIRTHS])
                    except KeyError:
                        teenBirthsDict[state] = int(line[BIRTHS])
                        
        # Turn teen births into rates. NOTE: some states have
        # no births with mother under 15. So combining this
        # computation into the loop above doesn't work as well
        # as I'd first thought.
        
        for state in teenBirthsDict.keys():
            # The percentage of total births that are teen births
            # for this state: 
            teenBirthsDict[state] = 100.0 * float(teenBirthsDict[state]) / float(totalBirthsDict[state])
        
        if outFile is None:
            print(json.dumps(teenBirthsDict))
        else:
            with open(outFile, 'w') as outFd:
                outFd.write(json.dumps(teenBirthsDict))
                
    def makeTotalBirthsDict(self, totalBirthsFilePath):
        NOTES  = 0;
        STATE  = 1;
        BIRTHS = 3;
        totalBirthsDict = {}
        with open(totalBirthsFilePath, 'r') as totalBirthsFd:
            csvReader = csv.reader(totalBirthsFd, delimiter='\t')
            # Swallow the header:
            csvReader.next();
            for line in csvReader:
                if len(line[NOTES]) == 0:
                    totalBirthsDict[line[STATE]] = int(line[BIRTHS])
        return totalBirthsDict

        
if __name__ == '__main__':
    processor = NatalityFileProcessor('/Users/paepcke/Project/Teaching/Stats60/Data/Natality/teenBirthsByStateAgeMother2007To2014.txt',
                                      '/Users/paepcke/Project/Teaching/Stats60/Data/Natality/totalBirthsByState2007To2014.txt',
                                      '/Users/paepcke/Project/Teaching/Stats60/Data/Natality/teenBirthRatesByState2007To2014.json')
    print('JSON is in /Users/paepcke/Project/Teaching/Stats60/Data/Natality/teenBirthRatesByState2007To2014.json')