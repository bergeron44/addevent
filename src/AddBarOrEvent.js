import React, { useState } from "react";
import axios from "axios";
import "./AddBarOrEvent.css";

const API_BASE_URL = "https://final-project-server-sk27.onrender.com";
const locations = {
  "Beer Sheva": { lat: 31.252121, lng: 34.786609 },
  "Ben Gurion University of the Negev": { lat: 31.261436,lng: 34.799552},
  "Zalman Aranne Central Library": { lat: 31.262074, lng: 34.800803 },
  "Kreitman Building": { lat: 31.262092,lng: 34.802325 },
  "Mexicani Ben Gurion": { lat: 31.261990,lng: 34.804332},
  "The student house building 70": { lat: 31.263123, lng: 34.801976 },
  "Building 90 Ben Gurion University": { lat: 31.264854,  lng: 34.803088 },
  "Husidman Center for science-seeking youth": { lat: 31.261327, lng: 34.801319 },
  "Parking 1 Ben Gurion University": { lat: 31.263488, lng: 34.799791},
  "Sports Center Ben-Gurion University": { lat: 31.261853, lng:  34.807128 },
  "Gate of Mexico Ben Gurion University": { lat: 31.262344, lng: 34.805657},
  "Building 34 Ben Gurion University": { lat: 31.262046, lng: 34.803392 },
  "Ben Gurion Soroka Gate": { lat: 31.261276 , lng: 34.801194 },
  "Joya Claire Sonnenfeldt Auditorium ": { lat: 31.262523 , lng: 34.800567 },

  "Writers Park": { lat: 31.255490, lng: 34.788592},
  "Block": { lat: 31.259226, lng: 34.797065},
  "Soroka Medical Center": { lat: 31.258022,lng: 34.800301},
  "Performing Arts Center Beer Sheva": { lat: 31.251716, lng: 34.797173},
  "The old city of Beer Sheva": { lat: 31.239323, lng: 34.790232},
  "Carasso Science Park": { lat: 31.241991, lng: 34.786072},
  "Ofer Grand Canyon": { lat: 31.251187, lng: 34.771704},
  "Shchuna B": { lat: 31.255540, lng: 34.787802},
  "Shchuna D": { lat: 31.264954, lng:  34.795510},
  "Shchuna C": { lat: 31.253914, lng: 34.805580},
  "Big Beer Sheva": { lat: 31.245246, lng: 34.811500},
  "Gav-Yam Negev Advanced Technologies Park": { lat: 31.265103, lng: 34.814307},
  "Ramot": { lat: 31.273787,lng: 34.811362},
  "Turner Stadium": { lat: 31.274092,lng: 34.779327}, 
  "Forum club": { lat: 31.221058,  lng: 34.803028},
  "Beer Sheva River Park": { lat: 31.237292,  lng: 34.828784},
  "Beer Sheva Youth Center": { lat: 31.241839 ,  lng: 34.788323},
  
  
  "Rega B Park Beer Sheva": { lat: 31.257014, lng: 34.794165},
  "Bengi": { lat: 31.264579, lng: 34.797307},
  "Lee Office": { lat: 31.264396, lng: 34.798339},
  "BarGiora": { lat: 31.2612,lng: 34.7925},
  "Ashanhazman": { lat: 31.237619,lng: 34.788384},
  "SassonBar": { lat: 31.2401,lng: 34.7886},
  "Mileva": { lat: 31.2617,lng: 34.7965},
  "BarBaSaba": { lat: 31.2476,lng: 34.7988},
  "JEMS": { lat: 31.2634,lng: 34.8106},
  "nano": { lat: 31.2583,lng: 34.7932},
  "ringelblum13": { lat: 31.2675,lng: 34.8002},
  "מיני שני": { lat: 31.258708,lng: 34.794616},
 "החומוס של טחינה": { lat: 31.26511,lng: 34.80084},
 "Friends": { lat: 31.258293,lng:34.794646},
 "Pub Giza": { lat: 31.254511,lng: 34.790957},
 "Zalame ACB": { lat: 31.243063,lng: 34.804604},
 "Château D'Or": { lat: 31.240597,lng: 34.788716},
 "Roots Bar & Kitchen": { lat: 31.267882,lng: 34.800137},
 "halutz 33": { lat: 31.238207,lng: 34.788143},
};
const AddBarOrEvent = () => {
  const [type, setType] = useState("bar");
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    location: {
      lat: 0,
      lng: 0,
    },
    instagram: "",
    videoUrl: "",
    imageUrl: "",
    likes: 0,
    discountOne: "",
    discountSec: "",
    discountThi: "",
    type: "",
    description: "",
    date: "",
    price: 0,
    photo: "",
    website: "",
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === "lat" || name === "lng") {
      setFormData({
        ...formData,
        location: {
          ...formData.location,
          [name]: parseFloat(value) || 0, // Convert to number
        },
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleLocationSelect = (e) => {
    const locationName = e.target.value;
    const location = locations[locationName];
    if (location) {
      setFormData({
        ...formData,
        location: { ...location },
      });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!formData.name || !formData.location.lat || !formData.location.lng) {
      alert("Please fill in all required fields (Name, Latitude, and Longitude).");
      setLoading(false);
      return;
    }

    if (type === "bar" && (!formData.discountOne || !formData.discountSec || !formData.discountThi)) {
      alert("Please fill in all required discount fields for the bar.");
      setLoading(false);
      return;
    }

    if (type === "event" && (!formData.type || !formData.description || !formData.date)) {
      alert("Please fill in all required event fields (Type, Description, and Date).");
      setLoading(false);
      return;
    }

    const endpoint = type === "bar" ? `${API_BASE_URL}/api/bars` : `${API_BASE_URL}/api/events`;

    try {
      await axios.post(endpoint, formData);
      alert(`${type === "bar" ? "Bar" : "Event"} added successfully!`);
      setFormData({
        name: "",
        location: { lat: 0, lng: 0 },
        instagram: "",
        videoUrl: "",
        imageUrl: "",
        likes: 0,
        discountOne: "",
        discountSec: "",
        discountThi: "",
        type: "",
        description: "",
        date: "",
        price: 0,
        photo: "",
        website: "",
      });
    } catch (error) {
      alert("Error adding the data. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="form-container">
      <h2 className="form-title">Add {type === "bar" ? "Bar" : "Event"}</h2>
      <div className="tab-container">
        <button
          className={`tab ${type === "bar" ? "active" : ""}`}
          onClick={() => setType("bar")}
        >
          Add Bar
        </button>
        <button
          className={`tab ${type === "event" ? "active" : ""}`}
          onClick={() => setType("event")}
        >
          Add Event
        </button>
      </div>

      <form onSubmit={handleSubmit} className="form-content">
        <input
          type="text"
          name="name"
          value={formData.name}
          placeholder="Name"
          onChange={handleInputChange}
          required
        />
        <select onChange={handleLocationSelect} defaultValue="">
          <option value="" disabled>
            Select a Location
          </option>
          {Object.keys(locations).map((key) => (
            <option key={key} value={key}>
              {key}
            </option>
          ))}
        </select>
        <input
          type="number"
          name="lat"
          value={formData.location.lat}
          placeholder="Latitude"
          onChange={handleInputChange}
          required
        />
        <input
          type="number"
          name="lng"
          value={formData.location.lng}
          placeholder="Longitude"
          onChange={handleInputChange}
          required
        />
        {type === "bar" && (
          <>
            <input
              type="text"
              name="instagram"
              value={formData.instagram}
              placeholder="Instagram URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="videoUrl"
              value={formData.videoUrl}
              placeholder="Video URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="imageUrl"
              value={formData.imageUrl}
              placeholder="Image URL"
              onChange={handleInputChange}
            />
            <input
              type="number"
              name="likes"
              value={formData.likes}
              placeholder="Likes"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="discountOne"
              value={formData.discountOne}
              placeholder="First Discount"
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="discountSec"
              value={formData.discountSec}
              placeholder="Second Discount"
              onChange={handleInputChange}
              required
            />
            <input
              type="text"
              name="discountThi"
              value={formData.discountThi}
              placeholder="Third Discount"
              onChange={handleInputChange}
              required
            />
          </>
        )}
        {type === "event" && (
          <>
            <select
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
            >
              <option value="">Event Type</option>
              <option value="party">מסיבה</option>
              <option value="concert">מופע</option>
              <option value="studentfair">יריד תעסוקה</option>
              <option value="student">ארוע של סטודנטים</option>
              <option value="Lecture">הרצאה</option>
              <option value="standup">סטאנד אפ</option>
              <option value="houseparty">מסיבת דירה </option>
              <option value="sport">ארוע ספורט</option>
              <option value="socialinvolvement"> התנדבות</option>
              <option value="academy"> אקדמיה</option>
              <option value="culture"> תרבות</option>
              <option value="holidays"> חגים ומועדים</option>
              <option value="welfare"> רווחה</option>
              <option value="show"> ארוע ענקי</option>



            </select>
            <textarea
              name="description"
              value={formData.description}
              placeholder="Description"
              onChange={handleInputChange}
              required
            />
            <input
              type="date"
              name="date"
              value={formData.date}
              onChange={handleInputChange}
              required
            />
            <input
              type="number"
              name="price"
              value={formData.price}
              placeholder="Price"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="photo"
              value={formData.photo}
              placeholder="Photo URL"
              onChange={handleInputChange}
            />
            <input
              type="text"
              name="website"
              value={formData.website}
              placeholder="Website URL"
              onChange={handleInputChange}
            />
          </>
        )}
        <button type="submit" disabled={loading}>
          {loading ? "Submitting..." : `Add ${type === "bar" ? "Bar" : "Event"}`}
        </button>
      </form>
    </div>
  );
};

export default AddBarOrEvent;
