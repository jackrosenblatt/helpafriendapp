import React from 'react';
import { Permissions, MapView } from 'expo';
import { StyleSheet, View, Text, TouchableOpacity, TextInput, ListView, Alert,
  AsyncStorage, RefreshControl, Button, Image, DatePickerIOS } from 'react-native';
import { StackNavigator } from 'react-navigation';
import moment from 'moment';

var GOOGLE_API_KEY2='AIzaSyDlXk18Mi2CRdBZ6nIdfrmIIejikcyia3Y';
var GOOGLE_API_KEY='AIzaSyAO1SPYcbtw_MFPBS1TKkzp8BnYMqEjGks'
var GOOGLE_API_REVERSE_GEOLOCATING='https://maps.googleapis.com/maps/api/geocode/json?latlng='
var END_DATE_CONST = new Date(new Date().getTime() + 1000*60*60*24*30)
console.disableYellowBox = true

class JobScreen extends React.Component {
  static navigationOptions =  (props) => ({
    title: 'Jobs',
    headerRight: <Button title="Filter Results" onPress={() => props.navigation.navigate('Filter')}/>
  });

  constructor(props) {
    super(props)
    this.state = {
      jobs: [],
      startDate: new Date(),
      endDate: END_DATE_CONST,
      filteredJobs: [],
      address: '450 9th St, San Francisco, CA 94103'
    }
  }

  componentDidMount() {
    console.log('called');
    var jobs;
    var filteredJobs;
    var maxDistance;
    var startDate;
    var endDate;
    AsyncStorage.getItem('filterState').then(data => {
      maxDistance = data ? JSON.parse(data).maxDistance : 999999999
      startDate = data ? JSON.parse(data).startDate : new Date()
      endDate = data ? JSON.parse(data).endDate : END_DATE_CONST
      return fetch('https://murmuring-dawn-35157.herokuapp.com/mobile/api/jobs/all');
    })
    .then(resp => resp.json())
    .then((respJson) => {
      jobs = respJson.success ? respJson.message : [];
      return Promise.all(
        jobs.map(job =>
          fetch(
            'https://maps.googleapis.com/maps/api/directions/json?origin='+this.state.address+'&destination='+job.location+'&key='+GOOGLE_API_KEY2
          )
        )
      )})
    .then(results => Promise.all(results.map(result => result.json())))
    .then(results => {
        console.log(results)
        var distances = results.map(response => response.status === 'NOT_FOUND' ? 0 :
        parseInt(response.routes[0].legs[0].distance.text.split(' ')[0].split(',').join('')));
        console.log(distances, "distances", maxDistance, startDate, endDate)
        filteredJobs = jobs.filter((job, idx) => (distances[idx] < maxDistance
          && new Date(startDate).getTime() < new Date(job.when).getTime() && new Date(endDate).getTime() > new Date(job.when).getTime()));
        this.setState({jobs, filteredJobs});
      })
    .catch(console.log)

    navigator.geolocation.getCurrentPosition(
      (success) => {
        fetch(GOOGLE_API_REVERSE_GEOLOCATING+success.coords.latitude+','+success.coords.longitude+'&key='+GOOGLE_API_KEY)
        .then(resp => resp.json())
        .then(response => {
          this.setState('address',response.results[0].formatted_address)
        })
      },
      (error) => {},
      {})
  }

  handleFilter(startDate, endDate, radius) {
    this.setState({startDate, endDate, radius})
  }

  render() {
    return (
      <JobList jobs={this.state.filteredJobs}
        navigation={this.props.navigation}/>
    )
  }
}

class JobList extends React.Component {

  constructor(props) {
    super(props);
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => (r1 !== r2)});
    console.log('jobList'+this.props.jobs)
    this.state = {
      dataSource: ds.cloneWithRows(this.props.jobs),
      refreshing: false
    }
  }

  componentWillReceiveProps(nextProps) {
    const ds = new ListView.DataSource({rowHasChanged: (r1, r2) => (r1 !== r2)});
    console.log('nextProps'+nextProps.jobs.map(x => x.picture))
    this.setState({dataSource: ds.cloneWithRows(nextProps.jobs)})
  }

 render() {
   return (
     <View style={styles.container}>
       <ListView
         style={{alignSelf:'stretch'}}
         dataSource={this.state.dataSource}
         renderRow={(rowData) =>(
             <JobItem job={rowData} navigation={this.props.navigation} />
         )}
       />
     </View>
   )
 }
}

class JobItem extends React.Component {
  details() {
    AsyncStorage.setItem('job', JSON.stringify(this.props.job))
    this.props.navigation.navigate('JobDetails')
  }

  render() {
   console.log(this.props.job.picture || 'https://placebear.com/50/50')
   return (
     <View style={styles.jobContainer}>
       <View style={styles.picContainer}>
         <Image source={{uri: this.props.job.picture || 'https://placebear.com/50/50'}} style={{width: 150, height: 150}} />
       </View>
       <View style={styles.wordContainer}>
         <Text>{this.props.job.title}</Text>
         <View style={{flexDirection: 'row'}}>
           <Text>${this.props.job.totalPay}</Text>
           <Text>   {this.props.job.timeAllotted}</Text>
         </View>
       </View>
       <View style={styles.viewMoreContainer}>
         <Button title='>' onPress={() => this.details()}></Button>
       </View>
     </View>
   )
 }
}

class JobDetailsScreen extends React.Component {
  static navigationOptions = {
    title: 'Job Details'
  };

  constructor(props){
    super(props)
    this.state = {
      job: {}
    }
  }

  componentDidMount() {
    AsyncStorage.getItem('job')
      .then((result) => {
        this.setState({job: JSON.parse(result)});
      })
  }

  apply() {
    AsyncStorage.setItem('jobId', JSON.stringify(this.state.job))
    this.props.navigation.navigate('Application')
  }

  render() {
    return (
      <View style={styles.container}>
        <Image style={{width: 100, height: 100}} source={{uri: this.state.job.picture}} />
        <Text style={{textAlign: 'center'}}>Employer Name: {this.state.job.employerName}</Text>
        <Text style={{textAlign: 'center'}}>Title: {this.state.job.title}</Text>
        <Text style={{textAlign: 'center'}}>Description: {this.state.job.description}</Text>
        <Text style={{textAlign: 'center'}}>Location: {this.state.job.location}</Text>
        <Text style={{textAlign: 'center'}}>When: {moment(this.state.job.title).format('MM/DD/YYYY, h:mm a')}</Text>
        <Text style={{textAlign: 'center'}}>Total Pay: ${this.state.job.totalPay}</Text>
        <Text style={{textAlign: 'center'}}>Time Allotted: {this.state.job.timeAllotted}</Text>
        <Button title='Apply Now' onPress={() => this.apply()}/>
      </View>
    );
  }
}

class FilterScreen extends React.Component {
  static navigationOptions = {
    title: 'Filter'
  };

  constructor(props) {
    super(props)
    this.state = {
      maxDistance: Number.MAX_VALUE,
      startDate: new Date(),
      endDate: END_DATE_CONST,
      showStartPicker: false,
      showEndPicker: false
    }
  }

  submit() {
    AsyncStorage.setItem('filterState', JSON.stringify(this.state))
    this.props.navigation.navigate('Jobs')
  }

  render(){
    var showStartDatePicker =
      (this.state.showStartPicker)  ? <DatePickerIOS style={{ height: 150, width: 300}}
      date={this.state.startDate} onDateChange={(date)=>this.setState({startDate: date})}
      mode="datetime"/> : null

    var showEndDatePicker =
      (this.state.showEndPicker) ? <DatePickerIOS style={{ height: 300, width: 300}}
      date={this.state.endDate} onDateChange={(date)=>this.setState({endDate: date})}
      mode="datetime"/> : null

    var showDistance = !(this.state.showStartPicker || this.state.showEndPicker) ?
    <View style={styles.viewMoreContainer}>
      <Text>Furthest Acceptable Distance</Text>
      <TextInput keyboardType='numeric' placeholder="Enter a maximum number of miles"
        value={this.state.maxDistance} onChangeText={num => this.setState({maxDistance: num})}/>
    </View> : null

    var showSubmit = !(this.state.showStartPicker || this.state.showEndPicker) ?
    <View style={styles.viewMoreContainer}>
      <TouchableOpacity style={[styles.button, styles.buttonBlue]}
        onPress={() => this.submit()}>
        <Text style={styles.buttonLabel}>Submit</Text>
      </TouchableOpacity>
    </View> : null

    return (
      <View style={styles.container}>
        <View style={styles.viewMoreContainer}>
          <Text style={{fontSize: 50}}>Filter</Text>
        </View>

        {showDistance}

        <View style={styles.viewMoreContainer}>
          <TouchableOpacity style={{alignItems: 'center'}} onPress={() => this.setState({showStartPicker: !this.state.showStartPicker})}>
            <Text>Start Date</Text>
            <Text>{moment(this.state.startDate).format('MM/DD/YYYY, h:mm a')}</Text>
          </TouchableOpacity>
          {showStartDatePicker}
        </View>

        <View style={styles.viewMoreContainer}>
          <TouchableOpacity style={{alignItems: 'center'}} onPress={() => this.setState({showEndPicker: !this.state.showEndPicker})}>
            <Text>End Date</Text>
            <Text>{moment(this.state.endDate).format('MM/DD/YYYY, h:mm a')}</Text>
          </TouchableOpacity>
          {showEndDatePicker}
        </View>

        {showSubmit}
      </View>
    )
  }
}

class ApplicationFormScreen extends React.Component {
  static navigationOptions =  (props) => ({
    title: 'Application'
  });

  constructor(props){
    super(props)
    this.state = {
      fName: '',
      mName: '',
      lName: '',
      email: '',
      phone: 0,
      social: 0,
      password: '',
      confirmPassword: '',
      jobId: ''
    }
  }

  componentDidMount() {
    AsyncStorage.getItem('jobId')
    .then(id => {jobId=JSON.parse(id)})
  }

  submit() {
    // if(this.state.fName && this.state.mName && this.state.lName && this.state.email &&
    //   this.state.phone && this.state.social && this.state.password && this.state.confirmPassword &&
    //   this.state.password === this.state.confirmPassword) {
    //     fetch('http://murmuring-dawn-35157.heroku.com/mobile/api/jobs/'+jobId, {
    //       method: 'POST',
    //       body: JSON.stringify({
    //         firstName: this.state.fName,
    //         middleName: this.state.mName,
    //         lastName:this.state.lName,
    //         email: this.state.email,
    //         phoneNumber: this.state.phone,
    //         socialSecurityNumber: this.state.social,
    //         password: this.state.password
    //       })
    //     })
    //     .then((value) => {this.props.navigation.navigate('Congrats')})
    //     .catch(console.log)
    //   }
    //   else{
    //     console.log(this.state.fName, this.state.mName)
    //   }
    this.props.navigation.navigate('Congrats')
  }

  render() {
    return (
      <View style={styles.container}>
        <TextInput placeholder='Enter your first name'
          onChange={name => this.setState({fName: name})} />

        <TextInput placeholder='Enter your middle name'
          onChange={name => this.setState({mName: name})} />

        <TextInput placeholder='Enter your last name'
          onChange={name => this.setState({lName: name})} />

        <TextInput keyboardType='email-address' placeholder='Enter your email'
          onChange={email => this.setState({email})} />
        <TextInput keyboardType='numeric' placeholder='Enter your phone'
          onChange={num => this.setState({phone: num})} />

        <TextInput keyboardType='numeric' placeholder='Enter your social security number'
          onChange={social => this.setState({social})} />

        <TextInput placeholder='Enter your password' secureTextEntry={true}
          onChange={pass => this.setState({password: pass})} />

        <TextInput placeholder='Enter your confirm password' secureTextEntry={true}
          onChange={pass => this.setState({confirmPassword: pass})} />

        <Button title='Submit' onPress={() => this.submit()}/>
      </View>
    )
  }
}

class CongratsScreen extends React.Component {
  static navigationOptions =  (props) => ({
    title: 'Congrats',
    headerRight: <Button title="Back to Jobs" onPress={() => props.navigation.navigate('Jobs')}/>
  });

  render() {
    return(
      <Text>Congrats!</Text>
    )
  }
}

export default StackNavigator({
  Jobs: {
    screen: JobScreen
  },
  JobDetails: {
    screen: JobDetailsScreen
  },
  Filter: {
    screen: FilterScreen
  },
  Application: {
    screen: ApplicationFormScreen
  },
  Congrats: {
    screen: CongratsScreen
  }
}, {initialRouteName: 'Jobs'});


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  jobContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    marginBottom: 10
  },
  picContainer: {
    flex: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  wordContainer: {
    flex: 2,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  viewMoreContainer: {
    flex: 1,
    backgroundColor: '#fff',
    alignItems: 'center'
  }
});
